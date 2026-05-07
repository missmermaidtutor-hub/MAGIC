import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  Platform,
  AppState,
  PanResponder,
} from 'react-native';
import { openMailto, sanitizeShareUrl } from '../utils/emailUtils';
import { trackAction } from '../services/analyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import rankingCriteria from '../ranking-criteria.json';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  getCouragesForDate,
  getUserVotesForDate,
  submitVoteBatch,
  getAllVotesForDate,
  saveInspiration,
  deleteInspiration,
  recordArtSave,
  removeArtSave,
  recordStockImageScores,
} from '../services/firestoreService';
import { getESTDate, getESTYesterday } from '../utils/dateUtils';
import { showAlert } from '../utils/alertUtils';
import ThemedBackground from '../components/ThemedBackground';
import { getAssetByID } from '@react-native/assets-registry/registry';
import ARTOWORKS_IMAGES from '../utils/artoworksImages';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;


// Persistent key for sliding-window "recently seen" stock images (not date-keyed)
const STOCK_SEEN_KEY = 'stock_seen_recent';

// Fisher-Yates shuffle — unbiased, all permutations equally likely
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Candle component for saving inspirations
const Candle = ({ lit = false, onPress, size = 36 }) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center' }}>
    {lit && (
      <View style={{
        width: size * 0.3,
        height: size * 0.4,
        borderRadius: size * 0.15,
        backgroundColor: '#FF8C00',
        marginBottom: -4,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 12,
        transform: [{ scaleX: 0.7 }],
      }}>
        <View style={{
          width: size * 0.15,
          height: size * 0.2,
          borderRadius: size * 0.1,
          backgroundColor: '#FFFF00',
          alignSelf: 'center',
          marginTop: size * 0.08,
        }} />
      </View>
    )}
    {!lit && <View style={{ height: size * 0.4 - 4 }} />}
    <View style={{
      width: 2,
      height: size * 0.15,
      backgroundColor: lit ? '#333' : '#666',
      marginBottom: -1,
    }} />
    <View style={{
      width: size * 0.35,
      height: size * 0.5,
      backgroundColor: lit ? '#FFF8DC' : '#8B8682',
      borderRadius: 3,
      borderWidth: 1,
      borderColor: lit ? '#FFD700' : '#555',
      shadowColor: lit ? '#FFD700' : 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: lit ? 0.8 : 0,
      shadowRadius: 8,
    }} />
  </TouchableOpacity>
);

export default function InspireScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const [todaysCriterion, setTodaysCriterion] = useState('');
  const [rankings, setRankings] = useState({}); // { courageId: score }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [postVoteModalVisible, setPostVoteModalVisible] = useState(false);
  const [browseMode, setBrowseMode] = useState(false);
  const [currentSet, setCurrentSet] = useState([]);
  const [initialRealCount, setInitialRealCount] = useState(0); // total eligible real arts for today's ranking
  const [votedCourageIds, setVotedCourageIds] = useState(new Set());
  const [availableCourages, setAvailableCourages] = useState([]); // all eligible, minus own
  const [fullViewArtwork, setFullViewArtwork] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [savedInspirations, setSavedInspirations] = useState(new Set());
  const [voteCountMap, setVoteCountMap] = useState({}); // courageId → number of votes received
  const [hasRankedToday, setHasRankedToday] = useState(false);
  const [continueVoting, setContinueVoting] = useState(false);
  const [criteriaModalVisible, setCriteriaModalVisible] = useState(false);
  const soundRef = useRef(null);
  // Holds the current full-view navigation context so the stable PanResponder can read it
  const fullViewNavRef = useRef({ viewableSet: [], currentIndex: -1 });

  // Stable swipe PanResponder for the full-view modal
  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderRelease: (_, gs) => {
        const { viewableSet, currentIndex } = fullViewNavRef.current;
        if (gs.dx < -50 && currentIndex < viewableSet.length - 1) {
          setFullViewArtwork(viewableSet[currentIndex + 1]);
        } else if (gs.dx > 50 && currentIndex > 0) {
          setFullViewArtwork(viewableSet[currentIndex - 1]);
        }
      },
    })
  ).current;

  // Load criterion + saved inspirations
  useEffect(() => {
    loadTodaysCriterion();
    loadSavedInspirations();
  }, []);

  // Show criteria overlay on first daily visit
  const criteriaChecked = useRef(false);
  useEffect(() => {
    if (criteriaChecked.current || !todaysCriterion) return;
    criteriaChecked.current = true;
    const checkFirstVisit = async () => {
      const today = getESTDate();
      const seen = await AsyncStorage.getItem(`inspire_criteria_seen_${today}`);
      if (!seen) {
        setCriteriaModalVisible(true);
        await AsyncStorage.setItem(`inspire_criteria_seen_${today}`, 'true');
      }
    };
    checkFirstVisit();
  }, [todaysCriterion]);

  // Load courages and votes when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) loadVotingData();
      return () => {
        // Cleanup audio on unfocus
        if (soundRef.current) {
          soundRef.current.unloadAsync();
          soundRef.current = null;
          setPlayingAudioId(null);
        }
      };
    }, [user])
  );

  // Refresh on app return from background (catches midnight rollover)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user?.uid) {
        loadVotingData();
      }
    });
    // Web: listen for tab visibility change (catches midnight rollover in open browser tab)
    const handleVisibility = () => {
      if (Platform.OS === 'web' && document.visibilityState === 'visible' && user?.uid) {
        loadVotingData();
      }
    };
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    return () => {
      sub.remove();
      if (Platform.OS === 'web') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [user]);

  const loadTodaysCriterion = async () => {
    try {
      const today = getESTDate();
      const savedDate = await AsyncStorage.getItem('criterion_date_v2');
      const savedCriterion = await AsyncStorage.getItem('todays_criterion');
      if (savedDate === today && savedCriterion) {
        setTodaysCriterion(savedCriterion);
      } else {
        const estDate = new Date(today + 'T12:00:00'); // parse EST date at noon to avoid timezone edge
        const dayOfYear = Math.floor((estDate - new Date(estDate.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const criterionIndex = dayOfYear % rankingCriteria.length;
        const newCriterion = rankingCriteria[criterionIndex];
        setTodaysCriterion(newCriterion);
        await AsyncStorage.setItem('criterion_date_v2', today);
        await AsyncStorage.setItem('todays_criterion', newCriterion);
      }
    } catch (error) {
      console.log('Error loading criterion:', error);
      setTodaysCriterion(rankingCriteria[0] || 'Beauty');
    }
  };

  // Load which artworks the user has saved as inspirations
  const loadSavedInspirations = async () => {
    try {
      const data = await AsyncStorage.getItem('favorite_artworks');
      if (data) {
        const favs = JSON.parse(data);
        setSavedInspirations(new Set(favs.map(a => a.id)));
      }
    } catch (e) {
      console.log('Error loading saved inspirations:', e);
    }
  };

  // Candle save — adds/removes from inspiration gallery + fills Connect star + tracks artSave
  const handleCandleSave = async (courage) => {
    try {
      const existing = await AsyncStorage.getItem('favorite_artworks');
      let favorites = existing ? JSON.parse(existing) : [];
      const alreadySaved = favorites.some(a => a.id === courage.id);

      if (alreadySaved) {
        favorites = favorites.filter(a => a.id !== courage.id);
        setSavedInspirations(prev => {
          const next = new Set(prev);
          next.delete(courage.id);
          return next;
        });
        // Remove from Firestore
        if (user) {
          deleteInspiration(user.uid, courage.id).catch(err =>
            console.log('Firestore delete inspiration error:', err)
          );
          // Remove art save record (courage owner tracking)
          if (courage.uid && courage.uid !== user.uid) {
            removeArtSave(courage.id, user.uid).catch(err =>
              console.log('removeArtSave error:', err)
            );
            trackAction('art_save_removed');
          }
        }
      } else {
        const inspiration = {
          id: courage.id,
          imageUrl: courage.mediaUrl || null,
          title: courage.title || 'Untitled',
          text: courage.text || '',
          textStyle: courage.textStyle || null,
          mediaType: courage.mediaType || 'image',
          source: 'candle_save',
          date: getESTDate(),
          savedAt: new Date().toISOString(),
        };
        favorites.push(inspiration);
        setSavedInspirations(prev => new Set(prev).add(courage.id));
        // Mark Connect star point for today
        const today = getESTDate();
        await AsyncStorage.setItem(`inspiration_saved_${today}`, 'true');
        // Sync to Firestore
        if (user) {
          saveInspiration(user.uid, inspiration).catch(err =>
            console.log('Firestore save inspiration error:', err)
          );
          // Record art save (courage owner tracking)
          if (courage.uid && courage.uid !== user.uid) {
            const pseudonym = userProfile?.pseudonym || 'Anonymous';
            recordArtSave(courage.uid, courage.id, user.uid, pseudonym, {
              mediaUrl:  courage.mediaUrl  || '',
              title:     courage.title     || '',
              mediaType: courage.mediaType || 'image',
              text:      courage.text      || '',
            }).catch(err => console.log('recordArtSave error:', err));
            trackAction('art_save_recorded');
          }
        }
      }
      await AsyncStorage.setItem('favorite_artworks', JSON.stringify(favorites));
    } catch (e) {
      console.log('Error toggling candle:', e);
    }
  };

  // Email share — opens email compose + fills Connect star
  const handleEmailShare = async (courage) => {
    const today = getESTDate();
    const shareTitle = 'Something that inspired me';
    const shareText =
      'This inspired me to send to you!\n\n' +
      (courage.title ? `"${courage.title}"\n\n` : '') +
      '[Add your message here]\n\n— Sent from MAGIC Tracker';

    // Resolve image URL — Firestore courages have mediaUrl, filler stock images use bundled require() assets
    let mediaUrl = courage.mediaUrl || null;

    if (!mediaUrl && courage.isFiller && Platform.OS === 'web') {
      const src = courage.source;

      if (typeof src === 'number') {
        // getAssetByID is imported at the top of the file (static import).
        // Dynamic require('@react-native/assets-registry/registry') does NOT work in Metro
        // production bundles — string-based requires are resolved at build time, not runtime.
        try {
          const meta = getAssetByID(src);
          if (meta && meta.httpServerLocation && meta.name && meta.type) {
            const loc = meta.httpServerLocation.replace(/\/$/, '');
            const sep = loc.startsWith('/') ? '' : '/';
            mediaUrl = window.location.origin + sep + loc + '/' + meta.name + '.' + meta.type;
          }
        } catch (e) {
          // getAssetByID failed — fall back to resolveAssetSource
          try {
            const resolved = Image.resolveAssetSource(src);
            if (resolved && resolved.uri && resolved.uri.length > 5) {
              mediaUrl = resolved.uri.startsWith('http')
                ? resolved.uri
                : window.location.origin + (resolved.uri.startsWith('/') ? resolved.uri : '/' + resolved.uri);
            }
          } catch (_) { /* no-op */ }
        }
      } else if (typeof src === 'string') {
        // Web production builds may return a string path (relative or absolute URL)
        if (src.startsWith('http')) {
          mediaUrl = src;
        } else {
          mediaUrl = window.location.origin + (src.startsWith('/') ? src : '/' + src);
        }
      }
    }

    const shareUrl = sanitizeShareUrl(mediaUrl);

    // Mobile web only: try Web Share API with actual compressed image (navigator.share on desktop
    // loses the user-gesture context after async fetch and opens no email option anyway)
    const isMobileWeb =
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.share &&
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobileWeb && mediaUrl) {
      try {
        const res = await fetch(mediaUrl);
        if (!res.ok) throw new Error('fetch failed');
        const blob = await res.blob();
        const compressedBlob = await new Promise((resolve) => {
          const img = new window.Image();
          const objUrl = URL.createObjectURL(blob);
          img.onload = () => {
            const MAX = 800;
            let { width, height } = img;
            if (width > MAX || height > MAX) {
              if (width >= height) { height = Math.round((height * MAX) / width); width = MAX; }
              else { width = Math.round((width * MAX) / height); height = MAX; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob((out) => { URL.revokeObjectURL(objUrl); resolve(out || blob); }, 'image/jpeg', 0.3);
          };
          img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(blob); };
          img.src = objUrl;
        });
        const file = new File([compressedBlob], 'artwork.jpg', { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: shareTitle, text: shareText, files: [file] });
          await AsyncStorage.setItem(`email_sent_${today}`, 'true');
          return;
        }
        // File share not supported — fall back to URL share via share sheet
        await navigator.share({ title: shareTitle, text: shareText, url: mediaUrl });
        await AsyncStorage.setItem(`email_sent_${today}`, 'true');
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') {
          await AsyncStorage.setItem(`email_sent_${today}`, 'true');
          return;
        }
        // Other error — fall through to mailto
      }
    }

    const body = shareUrl ? `${shareText}\n\n${shareUrl}` : shareText;
    openMailto(shareTitle, body);
    await AsyncStorage.setItem(`email_sent_${today}`, 'true');
  };

  // Pick 4 random stock images the user hasn't voted on today
  const pickStockSet = (alreadyVotedIds) => {
    const available = ARTOWORKS_IMAGES.filter(img => !alreadyVotedIds.has(img.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  };

  const loadVotingData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const votingDate = getESTYesterday();
      const today = getESTDate();

      // Try to fetch real courages from yesterday
      let courages = [];
      try {
        courages = await getCouragesForDate(votingDate);
        console.log(`[Inspire] Voting date: ${votingDate}, today: ${today}`);
        console.log(`[Inspire] Found ${courages.length} courages for ${votingDate}:`, courages.map(c => ({ id: c.id, uid: c.uid, date: c.date, pseudo: c.pseudonym })));
      } catch (e) {
        console.log('Could not fetch courages:', e);
      }

      // Filter out user's own courage
      const eligible = courages.filter(c => c.uid !== user.uid);
      console.log(`[Inspire] After filtering own (${user.uid}): ${eligible.length} eligible`);

      // Get user's existing votes (Firestore)
      let alreadyVotedIds = new Set();
      try {
        const existingVotes = await getUserVotesForDate(user.uid, votingDate);
        alreadyVotedIds = new Set(existingVotes.map(v => v.courageId));
      } catch (e) {
        console.log('Could not fetch votes from Firestore:', e);
      }

      // Local fallback: also check AsyncStorage for voted IDs (guards against Firestore query failures)
      try {
        const localVoted = await AsyncStorage.getItem(`voted_ids_${votingDate}`);
        if (localVoted) {
          JSON.parse(localVoted).forEach(id => alreadyVotedIds.add(id));
        }
      } catch (e) {}

      // Fetch ALL votes for this date to build vote count map (for fair exposure)
      let countMap = {};
      try {
        const allVotes = await getAllVotesForDate(votingDate);
        allVotes.forEach(v => {
          countMap[v.courageId] = (countMap[v.courageId] || 0) + 1;
        });
      } catch (e) {
        console.log('Could not fetch vote counts:', e);
      }
      setVoteCountMap(countMap);

      // Load recently-seen stock images (persistent sliding window — never resets daily)
      let stockVotedIds = new Set();
      try {
        const stockSeen = await AsyncStorage.getItem(STOCK_SEEN_KEY);
        if (stockSeen) {
          JSON.parse(stockSeen).forEach(id => stockVotedIds.add(id));
        }
      } catch (e) {}

      // Check if user already voted today
      const alreadyRanked = await AsyncStorage.getItem(`ranked_${today}`);
      setHasRankedToday(!!alreadyRanked);
      setContinueVoting(false);

      setAvailableCourages(eligible);
      setVotedCourageIds(alreadyVotedIds);
      setInitialRealCount(eligible.length);

      // Law: always show sets of 4.
      // 0 real arts → pure stock set of 4.
      // 1–3 real arts → pad with stock to reach 4.
      // 4+ real arts → real arts only, in batches of 4 (no stock).
      const unvoted = eligible.filter(c => !alreadyVotedIds.has(c.id));
      const availableStock = ARTOWORKS_IMAGES.filter(img => !stockVotedIds.has(img.id));

      if (unvoted.length >= 4) {
        // Enough real arts — sort by least-voted for fair exposure, show first 4
        const sorted = [...unvoted].sort((a, b) =>
          (countMap[a.id] || 0) - (countMap[b.id] || 0)
        );
        setCurrentSet(sorted.slice(0, 4));
        setAllDone(false);
      } else if (unvoted.length > 0) {
        // 1–3 real arts — pad with stock to reach 4
        const needed = 4 - unvoted.length;
        const stockFiller = shuffleArray(availableStock).slice(0, needed);
        const combined = [...unvoted, ...stockFiller];
        if (combined.length < 4) {
          setAllDone(true);
          setCurrentSet([]);
        } else {
          setCurrentSet(combined);
          setAllDone(false);
        }
      } else if (eligible.length === 0) {
        // No real arts submitted at all — pure stock set of 4
        const stockFiller = shuffleArray(availableStock).slice(0, 4);
        if (stockFiller.length < 4) {
          setAllDone(true);
          setCurrentSet([]);
        } else {
          setCurrentSet(stockFiller);
          setAllDone(false);
        }
      } else {
        // Real arts existed but user already voted on all of them
        setAllDone(true);
        setCurrentSet([]);
      }
    } catch (error) {
      console.log('Error loading voting data:', error);
      setAllDone(true);
      setCurrentSet([]);
    }
    setLoading(false);
  };

  const handleRank = (courageId, score) => {
    setRankings(prev => ({ ...prev, [courageId]: score }));
  };

  const handleSubmit = async () => {
    // Validate all 4 ranked
    const currentIds = currentSet.map(c => c.id);
    const batchRankings = {};
    currentIds.forEach(id => {
      if (rankings[id] !== undefined) batchRankings[id] = rankings[id];
    });

    if (Object.keys(batchRankings).length < currentSet.length) {
      showAlert('Incomplete', 'Please rank all artworks before submitting.');
      return;
    }

    // Check for duplicate ranks
    const usedRanks = Object.values(batchRankings);
    if (new Set(usedRanks).size !== usedRanks.length) {
      showAlert('Duplicate Ranks', `Rank these images from 1 (most aligned) to ${currentSet.length} (least aligned). Use each number only once.`);
      return;
    }

    setSubmitting(true);
    try {
      const votingDate = getESTYesterday();
      const today = getESTDate();

      // Separate real courages from stock images
      const realVotes = [];
      const stockIds = [];
      currentIds.forEach(id => {
        const item = currentSet.find(c => c.id === id);
        if (item?.isFiller) {
          stockIds.push(id);
        } else {
          realVotes.push({
            courageId: id,
            courageDate: votingDate,
            score: batchRankings[id],
          });
        }
      });

      // Submit real votes to Firestore (if any)
      if (realVotes.length > 0) {
        try {
          await submitVoteBatch(user.uid, realVotes);
        } catch (e) {
          console.log('Firestore vote submit error:', e);
          showAlert('Connection Error', 'Your ranking could not be saved. Please check your connection and try again.');
          setSubmitting(false);
          return; // Do NOT update local state — user can retry with same rankings
        }
      }

      // Save stock image seen IDs to persistent sliding window + record scores to Firestore
      if (stockIds.length > 0) {
        try {
          const existing = await AsyncStorage.getItem(STOCK_SEEN_KEY);
          const prev = existing ? JSON.parse(existing) : [];
          const merged = [...new Set([...prev, ...stockIds])];
          // Sliding window: keep last (pool - 4) entries so ≥4 images are always fresh
          const windowSize = Math.max(0, ARTOWORKS_IMAGES.length - 4);
          const trimmed = merged.slice(-windowSize);
          await AsyncStorage.setItem(STOCK_SEEN_KEY, JSON.stringify(trimmed));
        } catch (e) {}

        // Record filler scores to Firestore so HomeScreen can pick the best one
        try {
          const scoreEntries = stockIds
            .filter(id => batchRankings[id] !== undefined)
            .map(id => ({ id, score: batchRankings[id] }));
          if (scoreEntries.length > 0) await recordStockImageScores(scoreEntries);
        } catch (e) {}
      }

      // Mark ranked for today (for MAGIC star)
      await AsyncStorage.setItem(`ranked_${today}`, 'true');

      // Update voted IDs
      const newVotedIds = new Set(votedCourageIds);
      currentIds.forEach(id => newVotedIds.add(id));
      setVotedCourageIds(newVotedIds);

      // Save real voted IDs to AsyncStorage as local fallback (guards against Firestore query failures)
      if (realVotes.length > 0) {
        try {
          const existingLocal = await AsyncStorage.getItem(`voted_ids_${votingDate}`);
          const prev = existingLocal ? JSON.parse(existingLocal) : [];
          const merged = [...new Set([...prev, ...realVotes.map(v => v.courageId)])];
          await AsyncStorage.setItem(`voted_ids_${votingDate}`, JSON.stringify(merged));
        } catch (e) {}
      }

      // Reset rankings
      setRankings({});

      // Update vote counts for just-voted courages
      trackAction('vote_submitted');
      const updatedCounts = { ...voteCountMap };
      realVotes.forEach(v => {
        updatedCounts[v.courageId] = (updatedCounts[v.courageId] || 0) + 1;
      });
      setVoteCountMap(updatedCounts);

      // Law: if ≤4 real arts were available, no continue option — just thank you
      const unvotedReal = availableCourages.filter(c => !newVotedIds.has(c.id));

      if (initialRealCount <= 4) {
        // All real arts fit in one set — ranking is complete
        setAllDone(true);
        setCurrentSet([]);
      } else if (unvotedReal.length > 0) {
        // Re-fetch live vote counts from Firestore so next set reflects all concurrent rankers,
        // not just this user's local session counts.
        let liveCounts = { ...updatedCounts };
        try {
          const liveVotes = await getAllVotesForDate(getESTYesterday());
          liveCounts = {};
          liveVotes.forEach(v => {
            liveCounts[v.courageId] = (liveCounts[v.courageId] || 0) + 1;
          });
          setVoteCountMap(liveCounts);
        } catch (e) {
          // If Firestore read fails, fall back to local counts — still better than nothing
        }

        // More than 4 real arts existed — prepare next set of up to 4, fairest first
        const sorted = [...unvotedReal].sort((a, b) =>
          (liveCounts[a.id] || 0) - (liveCounts[b.id] || 0)
        );
        setCurrentSet(sorted.slice(0, 4));
        setPostVoteModalVisible(true);
      } else {
        setAllDone(true);
        setCurrentSet([]);
        showAlert('Thank You for Ranking!', 'You have ranked all available courages!');
      }
    } catch (error) {
      console.log('Error submitting votes:', error);
      showAlert('Error', 'Could not submit votes. Please try again.');
    }
    setSubmitting(false);
  };

  // Audio playback
  const playAudio = async (courage) => {
    try {
      // Stop current audio if playing
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (playingAudioId === courage.id) {
        setPlayingAudioId(null);
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: courage.mediaUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingAudioId(courage.id);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          setPlayingAudioId(null);
        }
      });
    } catch (error) {
      console.log('Error playing audio:', error);
      showAlert('Error', 'Could not play audio.');
    }
  };

  const rankedCount = Object.keys(rankings).length;
  const progressPercent = currentSet.length > 0 ? (rankedCount / currentSet.length) * 100 : 0;

  // Render a courage card for voting (anonymous - title only)
  const renderCourageCard = (courage) => {
    const currentRank = rankings[courage.id];
    const isAudio = courage.mediaType === 'audio';
    const isPlaying = playingAudioId === courage.id;
    const isSaved = savedInspirations.has(courage.id);
    const isTextOnly = courage.mediaType === 'text' || (!courage.mediaUrl && !courage.source && !isAudio);

    return (
      <View key={courage.id} style={styles.artworkCard}>
        {/* Image row: envelope | image | candle */}
        <View style={styles.imageActionRow}>
          {/* Email envelope on the left */}
          <TouchableOpacity
            style={styles.sideAction}
            onPress={() => handleEmailShare(courage)}
          >
            <Text style={styles.envelopeIcon}>✉️</Text>
          </TouchableOpacity>

          {/* Image, Audio, or Text */}
          {isTextOnly ? (
            <TouchableOpacity
              style={styles.textOnlyFrame}
              onPress={() => setFullViewArtwork(courage)}
              activeOpacity={0.8}
            >
              {courage.text ? (
                <>
                  {courage.title ? (
                    <Text style={styles.textCourageTitle} numberOfLines={1}>{courage.title}</Text>
                  ) : null}
                  <ScrollView
                    style={styles.textCourageScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                  >
                    <Text style={styles.textCourageContent}>{courage.text}</Text>
                  </ScrollView>
                </>
              ) : (
                <ScrollView
                  style={styles.textCourageScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={true}
                >
                  <Text style={styles.textCourageContent}>{courage.title}</Text>
                </ScrollView>
              )}
              {currentRank && (
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>#{currentRank}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.imageFrame}
              onPress={() => {
                if (isAudio) {
                  playAudio(courage);
                } else {
                  setFullViewArtwork(courage);
                }
              }}
            >
              {courage.source ? (
                <Image
                  source={courage.source}
                  style={styles.artworkImage}
                  resizeMode="contain"
                />
              ) : isAudio ? (
                <View style={styles.audioFrame}>
                  <Text style={styles.audioIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
                  <Text style={styles.audioLabel}>{isPlaying ? 'Playing...' : 'Tap to Play'}</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: courage.mediaUrl }}
                  style={styles.artworkImage}
                  resizeMode="contain"
                />
              )}
              {currentRank && (
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>#{currentRank}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Candle on the right — hidden for stock filler images */}
          <View style={styles.sideAction}>
            {!courage.isFiller && (
              <Candle
                lit={isSaved}
                onPress={() => handleCandleSave(courage)}
                size={32}
              />
            )}
          </View>
        </View>

        {/* Title only — skip for text-only courages (already visible in frame) */}
        {!isTextOnly && (
          <View style={styles.artistInfo}>
            <Text style={styles.artworkTitle} numberOfLines={2}>
              {courage.title || 'Untitled'}
            </Text>
          </View>
        )}

        {/* Ranking Buttons */}
        <View style={styles.rankingContainer}>
          <View style={styles.rankingButtons}>
            {Array.from({ length: currentSet.length }, (_, i) => i + 1).map((score) => {
              const isSelected = currentRank === score;
              return (
                <TouchableOpacity
                  key={score}
                  style={[
                    styles.rankButton,
                    isSelected && styles.rankButtonSelected,
                  ]}
                  onPress={() => handleRank(courage.id, score)}
                >
                  <Text style={[
                    styles.rankButtonText,
                    isSelected && styles.rankButtonTextSelected,
                  ]}>
                    {score}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // "Thank you for voting" card
  const renderThankYouCard = () => (
    <View style={styles.artworkCard}>
      <View style={[styles.imageFrame, styles.thankYouFrame]}>
        <Text style={styles.thankYouText}>Thank you{'\n'}for ranking!</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <ThemedBackground style={styles.container}>
        <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#004225" />
          <Text style={[styles.subtitle, { marginTop: 15, color: theme.text.body }]}>Loading courages...</Text>
        </View>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground style={styles.container}>
      {/* First-visit criteria overlay */}
      <Modal
        visible={criteriaModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCriteriaModalVisible(false)}
      >
        <View style={styles.criteriaOverlay}>
          <View style={styles.criteriaCard}>
            <Text style={styles.criteriaModalTitle}>Today's Ranking Criterion</Text>
            <Text style={styles.criteriaModalCriterion}>{todaysCriterion}</Text>
            <Text style={styles.criteriaModalBody}>
              Rank each artwork from 1 (most aligned) to 4 (least aligned) based on how well it embodies today's criterion. Use each number only once.
            </Text>
            <TouchableOpacity
              style={styles.criteriaModalBtn}
              onPress={() => setCriteriaModalVisible(false)}
            >
              <Text style={styles.criteriaModalBtnText}>Start Ranking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-page image viewer modal — swipeable through current set */}
      <Modal
        visible={fullViewArtwork !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullViewArtwork(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setFullViewArtwork(null)}
          >
            <Text style={styles.modalCloseText}>X</Text>
          </TouchableOpacity>
          {fullViewArtwork && (() => {
            const viewableSet = browseMode ? availableCourages : currentSet;
            const currentIndex = viewableSet.findIndex(c => c.id === fullViewArtwork.id);
            const hasPrev = currentIndex > 0;
            const hasNext = currentIndex < viewableSet.length - 1;
            // Keep ref in sync so the stable PanResponder reads latest values
            fullViewNavRef.current = { viewableSet, currentIndex };
            return (
              <View style={styles.modalContent} {...swipeResponder.panHandlers}>
                {fullViewArtwork.mediaUrl || fullViewArtwork.source ? (
                  <ScrollView
                    maximumZoomScale={5}
                    minimumZoomScale={1}
                    bouncesZoom={true}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.zoomContainer}
                    style={styles.zoomScroll}
                  >
                    <Image
                      source={fullViewArtwork.source || { uri: fullViewArtwork.mediaUrl }}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                  </ScrollView>
                ) : (
                  <ScrollView
                    style={styles.zoomScroll}
                    contentContainerStyle={styles.textFullViewContainer}
                  >
                    {fullViewArtwork.title && fullViewArtwork.text ? (
                      <Text style={[styles.textFullViewContent, { fontSize: 16, fontStyle: 'italic', marginBottom: 12, opacity: 0.7 }]}>{fullViewArtwork.title}</Text>
                    ) : null}
                    <Text style={styles.textFullViewContent}>{fullViewArtwork.text || fullViewArtwork.title}</Text>
                  </ScrollView>
                )}
                {(fullViewArtwork.mediaUrl || fullViewArtwork.source) && (
                  <Text style={styles.modalTitle}>{fullViewArtwork.title}</Text>
                )}
                {viewableSet.length > 1 && (
                  <View style={styles.fullViewNav}>
                    <TouchableOpacity
                      style={[styles.fullViewNavBtn, !hasPrev && { opacity: 0.3 }]}
                      onPress={() => hasPrev && setFullViewArtwork(viewableSet[currentIndex - 1])}
                      disabled={!hasPrev}
                    >
                      <Text style={styles.fullViewNavText}>Prev</Text>
                    </TouchableOpacity>
                    <Text style={styles.fullViewCounter}>{currentIndex + 1} / {viewableSet.length}</Text>
                    <TouchableOpacity
                      style={[styles.fullViewNavBtn, !hasNext && { opacity: 0.3 }]}
                      onPress={() => hasNext && setFullViewArtwork(viewableSet[currentIndex + 1])}
                      disabled={!hasNext}
                    >
                      <Text style={styles.fullViewNavText}>Next</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* Post-vote choice modal */}
      <Modal
        visible={postVoteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPostVoteModalVisible(false)}
      >
        <View style={styles.postVoteOverlay}>
          <View style={styles.postVoteCard}>
            <Text style={styles.postVoteTitle}>Thank You for Ranking!</Text>
            <Text style={styles.postVoteMessage}>
              Would you like to keep ranking to see more Courage from yesterday, or would you like to scroll through them without ranking? Close this window if you are ready to move on.
            </Text>
            <TouchableOpacity
              style={styles.postVoteBtn}
              onPress={() => {
                setPostVoteModalVisible(false);
                setBrowseMode(false);
              }}
            >
              <Text style={styles.postVoteBtnText}>Keep Ranking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.postVoteBtnSecondary}
              onPress={() => {
                setPostVoteModalVisible(false);
                setBrowseMode(true);
                setCurrentSet([]);
              }}
            >
              <Text style={[styles.postVoteBtnSecondaryText, theme.isDark && { color: '#ffffff' }]}>Browse Without Ranking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.postVoteCloseBtn}
              onPress={() => {
                setPostVoteModalVisible(false);
                setAllDone(true);
                setCurrentSet([]);
              }}
            >
              <Text style={styles.postVoteCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.header, { color: theme.text.heading }]}>Inspire</Text>
        <Text style={[styles.subtitle, { color: theme.text.body }]}>Rank Community Courage</Text>

        {/* Today's Ranking Criterion */}
        <View style={[styles.criterionCard, theme.isDark && { backgroundColor: 'rgba(0,40,20,0.85)', borderColor: '#4ade80' }]}>
          <Text style={[styles.criterionLabel, theme.isDark && { color: '#69e88c' }]}>Today's Ranking Criterion:</Text>
          <Text style={[styles.criterionText, theme.isDark && { color: '#4ade80' }]}>{todaysCriterion}</Text>
        </View>

        {/* All Done State */}
        {allDone && (
          <>
            <View style={styles.artworksGrid}>
              {renderThankYouCard()}
              {renderThankYouCard()}
              {renderThankYouCard()}
              {renderThankYouCard()}
            </View>
            <View style={styles.completeCard}>
              <Text style={[styles.completeText, theme.isDark && { color: '#ffffff' }]}>
                {availableCourages.length === 0
                  ? 'No courages available for ranking yet!'
                  : hasRankedToday
                    ? 'You already ranked today!'
                    : 'You have ranked all available courages!'}
              </Text>
              <Text style={[styles.completeSubtext, theme.isDark && { color: 'rgba(255,255,255,0.8)' }]}>
                {availableCourages.length === 0
                  ? 'Check back after others have uploaded their daily courage.'
                  : 'Come back tomorrow for new submissions!'}
              </Text>
            </View>
            {/* Offer browse option even when all done, if there are courages to browse */}
            {availableCourages.length > 0 && (
              <TouchableOpacity
                style={styles.postVoteBtnSecondary}
                onPress={() => { setAllDone(false); setBrowseMode(true); }}
              >
                <Text style={[styles.postVoteBtnSecondaryText, theme.isDark ? { color: '#ffffff' } : { color: '#004225' }]}>Browse Yesterday's Courages</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Browse Mode — scroll through all courages without voting */}
        {browseMode && !allDone && (
          <>
            <View style={styles.completeCard}>
              <Text style={[styles.completeText, theme.isDark && { color: '#ffffff' }]}>Browse Yesterday's Courages</Text>
              <Text style={[styles.completeSubtext, theme.isDark && { color: 'rgba(255,255,255,0.8)' }]}>Tap any image to view full size</Text>
            </View>
            <View style={styles.artworksGrid}>
              {availableCourages.map(courage => {
                const isSaved = savedInspirations.has(courage.id);
                return (
                  <View key={courage.id} style={styles.artworkCard}>
                    <View style={styles.imageActionRow}>
                      <TouchableOpacity style={styles.sideAction} onPress={() => handleEmailShare(courage)}>
                        <Text style={styles.envelopeIcon}>✉️</Text>
                      </TouchableOpacity>
                      {!courage.mediaUrl && !courage.source ? (
                        <TouchableOpacity
                          style={styles.textOnlyFrame}
                          onPress={() => setFullViewArtwork(courage)}
                        >
                          <Text style={styles.textCourageContent}>{courage.title}</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.imageFrame}
                          onPress={() => setFullViewArtwork(courage)}
                        >
                          {courage.source ? (
                            <Image source={courage.source} style={styles.artworkImage} resizeMode="contain" />
                          ) : (
                            <Image source={{ uri: courage.mediaUrl }} style={styles.artworkImage} resizeMode="contain" />
                          )}
                        </TouchableOpacity>
                      )}
                      <View style={styles.sideAction}>
                        {!courage.isFiller && (
                          <Candle lit={isSaved} onPress={() => handleCandleSave(courage)} size={32} />
                        )}
                      </View>
                    </View>
                    <View style={styles.artistInfo}>
                      <Text style={styles.artworkTitle} numberOfLines={2}>{courage.title || 'Untitled'}</Text>
                      {courage.pseudonym ? (
                        <Text style={styles.artworkPseudonym}>{courage.pseudonym}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.postVoteBtnSecondary}
              onPress={() => { setBrowseMode(false); setAllDone(true); }}
            >
              <Text style={[styles.postVoteBtnSecondaryText, theme.isDark ? { color: '#ffffff' } : { color: '#004225' }]}>Done Browsing</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Return Visit — already voted today, but more courages available */}
        {!allDone && !browseMode && hasRankedToday && !continueVoting && currentSet.length > 0 && (
          <View style={styles.completeCard}>
            <Text style={[styles.completeText, theme.isDark && { color: '#ffffff' }]}>You already ranked today!</Text>
            <Text style={[styles.completeSubtext, theme.isDark && { color: 'rgba(255,255,255,0.8)' }]}>
              There are new courages from yesterday you haven't seen yet.
            </Text>
            <View style={{ width: '100%', marginTop: 16, gap: 12 }}>
              <TouchableOpacity
                style={styles.postVoteBtn}
                onPress={() => setContinueVoting(true)}
              >
                <Text style={styles.postVoteBtnText}>Rank New Images</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postVoteBtnSecondary}
                onPress={() => { setBrowseMode(true); setCurrentSet([]); }}
              >
                <Text style={[styles.postVoteBtnSecondaryText, theme.isDark ? { color: '#ffffff' } : { color: '#004225' }]}>Browse Without Ranking</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Voting Mode */}
        {!allDone && !browseMode && (!hasRankedToday || continueVoting) && currentSet.length > 0 && (
          <>
            {/* Progress */}
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, theme.isDark && { color: '#ffffff' }]}>
                Ranked {rankedCount} of {currentSet.length} artworks
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>

            <Text style={[styles.instructionText, theme.isDark && { color: '#ffffff' }]}>
              Rank 1=most  {currentSet.length}=least meets the criteria of "{todaysCriterion}". Each rank used once.
            </Text>
            <Text style={[styles.instructionText, theme.isDark && { color: '#ffffff' }]}>
              Light candles to the right of image to save to your inspiration gallery on connect screen.
            </Text>

            {/* Artworks Grid */}
            <View style={styles.artworksGrid}>
              {currentSet.map(courage => renderCourageCard(courage))}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (submitting || rankedCount < currentSet.length) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || rankedCount < currentSet.length}
            >
              {submitting ? (
                <ActivityIndicator color="#cfe8c7" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Rankings</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Gallery Button */}
        <TouchableOpacity style={styles.galleryButton} onPress={() => navigation.navigate('Connect', { gallery: 'private' })}>
          <Text style={styles.galleryButtonText}>View My Inspiration Gallery</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 20,
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#3c9820',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#3c9820',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  criterionCard: {
    backgroundColor: 'rgba(207, 232, 199, 0.5)',
    borderWidth: 3,
    borderColor: '#004225',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  criterionLabel: {
    fontSize: 16,
    color: '#3c9820',
    marginBottom: 10,
  },
  criterionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3c9820',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#004225',
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(207, 232, 199, 0.5)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#004225',
  },
  instructionText: {
    fontSize: 14,
    color: '#004225',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  artworksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  artworkCard: {
    width: '48%',
    backgroundColor: 'rgba(207, 232, 199, 0.5)',
    borderWidth: 2,
    borderColor: '#004225',
    borderRadius: 12,
    padding: 6,
    marginBottom: 15,
  },
  imageActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sideAction: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeIcon: {
    fontSize: 18,
  },
  imageFrame: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#004225',
    position: 'relative',
    backgroundColor: '#0a1a0a',
  },
  textOnlyFrame: {
    flex: 1,
    backgroundColor: '#1a2a1a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#004225',
    padding: 12,
    height: 180,
    position: 'relative',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  audioFrame: {
    flex: 1,
    backgroundColor: '#1a2a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  audioLabel: {
    fontSize: 14,
    color: '#cfe8c7',
    fontWeight: '600',
  },
  textCourageFrame: {
    backgroundColor: '#1a2a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    minHeight: 120,
  },
  textCourageTitle: {
    fontSize: 11,
    color: '#cfe8c7',
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.6,
    marginBottom: 4,
  },
  textCourageScroll: {
    flex: 1,
  },
  textCourageContent: {
    fontSize: 12,
    color: '#cfe8c7',
    textAlign: 'center',
    lineHeight: 18,
  },
  thankYouFrame: {
    backgroundColor: 'rgba(207, 232, 199, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thankYouText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004225',
    textAlign: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#004225',
    borderRadius: 20,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#004225',
  },
  rankBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  artistInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  artworkTitle: {
    fontSize: 11,
    color: '#004225',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  artworkPseudonym: {
    fontSize: 11,
    color: '#4B0082',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  rankingContainer: {
    alignItems: 'center',
  },
  rankingButtons: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
  },
  rankButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(207, 232, 199, 0.5)',
    borderWidth: 2,
    borderColor: '#004225',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankButtonSelected: {
    backgroundColor: '#004225',
    borderColor: '#004225',
  },
  rankButtonText: {
    fontSize: 16,
    color: '#004225',
    fontWeight: 'bold',
  },
  rankButtonTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#004225',
    borderWidth: 3,
    borderColor: '#cfe8c7',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 20,
    color: '#cfe8c7',
    fontWeight: 'bold',
  },
  completeCard: {
    backgroundColor: 'rgba(207, 232, 199, 0.5)',
    borderWidth: 3,
    borderColor: '#004225',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  completeText: {
    fontSize: 20,
    color: '#004225',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  completeSubtext: {
    fontSize: 14,
    color: '#004225',
    textAlign: 'center',
  },
  galleryButton: {
    backgroundColor: '#4A148C',
    borderWidth: 3,
    borderColor: '#9C27B0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  galleryButtonText: {
    fontSize: 18,
    color: '#DDA0DD',
    fontWeight: 'bold',
  },
  // Full-page artwork viewer modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(207, 232, 199, 0.5)',
    borderWidth: 2,
    borderColor: '#004225',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#004225',
    fontWeight: 'bold',
  },
  modalContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 20,
  },
  zoomScroll: {
    width: SCREEN_WIDTH,
    maxHeight: Math.min(SCREEN_WIDTH, SCREEN_HEIGHT - 220),
    borderWidth: 3,
    borderColor: '#004225',
    borderRadius: 8,
  },
  zoomContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH - 6,
    height: Math.min(SCREEN_WIDTH - 6, SCREEN_HEIGHT - 226),
    borderRadius: 5,
  },
  modalTitle: {
    fontSize: 18,
    color: '#cfe8c7',
    fontStyle: 'italic',
    marginTop: 15,
  },
  textFullViewContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  textFullViewContent: {
    fontSize: 20,
    color: '#cfe8c7',
    textAlign: 'center',
    lineHeight: 30,
  },
  modalHint: {
    fontSize: 12,
    color: '#555',
    marginTop: 10,
  },
  fullViewNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 20,
  },
  fullViewNavBtn: {
    backgroundColor: 'rgba(207, 232, 199, 0.3)',
    borderWidth: 1,
    borderColor: '#004225',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  fullViewNavText: {
    color: '#cfe8c7',
    fontSize: 16,
    fontWeight: '600',
  },
  fullViewCounter: {
    color: '#cfe8c7',
    fontSize: 14,
  },
  postVoteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  postVoteCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  postVoteTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 16,
  },
  postVoteMessage: {
    fontSize: 15,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  postVoteBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  postVoteBtnText: {
    color: '#0a0e27',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postVoteBtnSecondary: {
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  postVoteBtnSecondaryText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  postVoteCloseBtn: {
    padding: 10,
  },
  postVoteCloseBtnText: {
    color: '#999',
    fontSize: 14,
  },
  // Criteria overlay
  criteriaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  criteriaCard: {
    backgroundColor: 'rgba(207, 232, 199, 0.95)',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#004225',
    padding: 30,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  criteriaModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#004225',
    textAlign: 'center',
    marginBottom: 16,
  },
  criteriaModalCriterion: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a5c00',
    textAlign: 'center',
    marginBottom: 20,
  },
  criteriaModalBody: {
    fontSize: 15,
    color: '#004225',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  criteriaModalBtn: {
    backgroundColor: '#004225',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  criteriaModalBtnText: {
    color: '#cfe8c7',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

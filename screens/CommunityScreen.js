import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  PanResponder,
} from 'react-native';
import { showAlert, showConfirm, showDestructiveConfirm } from '../utils/alertUtils';
import { persistImageUri, migrateGalleryImages } from '../utils/imageUtils';
import { openMailto } from '../utils/emailUtils';
import { trackAction } from '../services/analyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import {
  saveCuratedWork,
  removeCuratedWork,
  deleteArtwork,
  deleteInspiration,
  recordArtSave,
  removeArtSave,
  getMyArtSaves,
  getAllCuratedGalleriesGrouped,
  getUserCurated,
  getUserCourages,
  uploadMediaToStorage,
  getUserWinCount,
} from '../services/firestoreService';
import { getESTDate } from '../utils/dateUtils';
import { getMemberDayCount as getMemberDayCountUtil, getCuratedLimit, canAccessFeature } from '../utils/premiumUtils';
import PremiumPaywall from '../components/premium/PremiumPaywall';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Gold Frame component (matches HomeScreen)
const GoldFrame = ({ children, style, containerStyle, onPress, onLongPress, thickness = 4 }) => {
  const Wrapper = (onPress || onLongPress) ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8} style={[{
      borderRadius: 6,
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 8,
      alignSelf: 'stretch',
    }, containerStyle]}>
      <LinearGradient
        colors={['#FFF8DC', '#FFD700', '#B8860B', '#FFD700', '#FFFACD', '#DAA520', '#B8860B', '#FFD700', '#FFF8DC']}
        locations={[0, 0.12, 0.25, 0.4, 0.5, 0.6, 0.75, 0.88, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 6, padding: thickness }}
      >
        <View style={{
          borderRadius: 3,
          borderWidth: 0.5,
          borderColor: 'rgba(255, 248, 220, 0.5)',
        }}>
          <View style={[{ borderRadius: 3, overflow: 'hidden' }, style]}>
            {children}
          </View>
        </View>
      </LinearGradient>
    </Wrapper>
  );
};

// Candle component (matches HomeScreen)
const Candle = ({ lit = false, onPress, size = 40 }) => (
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

export default function CommunityScreen({ navigation, route }) {
  const { user, userProfile } = useAuth();
  const [curatedArtworks, setCuratedArtworks] = useState([]);
  const [personalArtworks, setPersonalArtworks] = useState([]);
  const [inspirationArtworks, setInspirationArtworks] = useState([]);
  const [activeGallery, setActiveGallery] = useState(route?.params?.gallery || 'newsfeed');
  const [fullViewImage, setFullViewImage] = useState(null);
  const [fullViewText, setFullViewText] = useState(null);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [savedNewsfeedArt, setSavedNewsfeedArt] = useState(new Set());
  // Carousel modal: { feedUser, currentIndex }
  const [carouselModal, setCarouselModal] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [userPseudonym, setUserPseudonym] = useState('');

  // Real newsfeed state
  const [newsfeedUsers, setNewsfeedUsers] = useState([]);
  const [newsfeedLoading, setNewsfeedLoading] = useState(false);
  const [feedUserWins, setFeedUserWins] = useState({});
  const [seenTapestries, setSeenTapestries] = useState({});

  // My Inspiring Works state
  const [myInspiringWorks, setMyInspiringWorks] = useState([]);
  const [inspiringWorksLoading, setInspiringWorksLoading] = useState(false);
  const [expandedSaveCounts, setExpandedSaveCounts] = useState({});

  // Day 13 popup
  const [showDay13Popup, setShowDay13Popup] = useState(false);

  // Trash system (24-hour recovery)
  const [trashedArtworks, setTrashedArtworks] = useState([]);
  const [showTrash, setShowTrash] = useState(false);
  const [pendingVotingArtworks, setPendingVotingArtworks] = useState([]);
  const trashCleanedRef = useRef(false); // only clean trash once per session

  // Red X marking system — items marked for bulk deletion
  const [markedForDeletion, setMarkedForDeletion] = useState(new Set());

  // Tapestry swap modal — tap a tapestry thumbnail to swap it
  const [tapestrySwapModal, setTapestrySwapModal] = useState(null);

  // Secret bookshelf — reveals Inspiring Others premium section
  const [showInspiringOthers, setShowInspiringOthers] = useState(false);

  // Second Thoughts — 24h recovery for removed inspirations
  const [showSecondThoughts, setShowSecondThoughts] = useState(false);

  // Swipe gesture for carousel modal
  const carouselSwipeRef = useRef(null);
  const carouselPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes (not vertical scroll or taps)
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          // Swipe left → next
          navigateCarouselRef.current?.(1);
        } else if (gestureState.dx > 50) {
          // Swipe right → previous
          navigateCarouselRef.current?.(-1);
        }
      },
    })
  ).current;
  const navigateCarouselRef = useRef(null);

  // Private tab side-by-side scroll refs
  const privateScrollRef = useRef(null);
  const inspirationScrollRef = useRef(null);
  const privateScrollOffset = useRef(0);
  const inspirationScrollOffset = useRef(0);
  const SCROLL_STEP = 200;
  const curioScrollRefs = useRef({});
  const curioScrollOffsets = useRef({});
  const CURIO_THUMB_SIZE = Math.floor((SCREEN_WIDTH - 20 - 16) / 3);
  const CURIO_SCROLL_STEP = CURIO_THUMB_SIZE * 3 + 16; // scroll 3 thumbs + gaps

  const scrollColumn = (ref, offsetRef, direction) => {
    const newOffset = Math.max(0, offsetRef.current + direction * SCROLL_STEP);
    offsetRef.current = newOffset;
    ref.current?.scrollTo({ y: newOffset, animated: true });
  };

  const scrollBothColumns = (direction) => {
    scrollColumn(privateScrollRef, privateScrollOffset, direction);
    scrollColumn(inspirationScrollRef, inspirationScrollOffset, direction);
  };

  // 13-day membership check (premium users get early access)
  const memberDays = getMemberDayCountUtil(userProfile);
  const canCurate = memberDays >= 13 || canAccessFeature('earlyCuratedAccess', userProfile);

  // Sync from auth context
  useEffect(() => {
    if (userProfile) {
      setUserPseudonym(userProfile.pseudonym || '');
      setIsAnonymous(userProfile.anonymous ?? false);
    }
  }, [userProfile]);

  useEffect(() => {
    // Only load things NOT already in useFocusEffect to avoid double-execution race conditions
    loadFollowedUsers();
    loadUserIdentity();
  }, []);

  // Day 13 popup (one-time)
  useEffect(() => {
    if (canCurate) {
      AsyncStorage.getItem('day13_popup_shown').then(shown => {
        if (!shown) {
          setShowDay13Popup(true);
          AsyncStorage.setItem('day13_popup_shown', 'true');
          trackAction('day_13_popup_shown');
        }
      });
    }
  }, [canCurate]);

  // Reload galleries when screen comes into focus & mark as browsed for Connect star
  useFocusEffect(
    useCallback(() => {
      loadAllGalleries();
      loadSavedArt();
      promotePendingVotingArtworks();
      loadNewsfeed();
      // Mark browsed for today's Connect (C) star point
      const today = getESTDate();
      AsyncStorage.setItem(`browsed_${today}`, 'true');
      // Switch to gallery tab if navigated with param
      if (route?.params?.gallery) {
        setActiveGallery(route.params.gallery);
      }
    }, [route?.params?.gallery])
  );

  const loadFollowedUsers = async () => {
    try {
      const data = await AsyncStorage.getItem('followed_users');
      if (data) setFollowedUsers(JSON.parse(data));
    } catch (error) {
      console.log('Error loading followed users:', error);
    }
  };

  const loadUserIdentity = async () => {
    try {
      // Context is primary source (set via useEffect above)
      // AsyncStorage as fallback for offline
      if (!userProfile) {
        const settingsRaw = await AsyncStorage.getItem('app_settings');
        const profileRaw = await AsyncStorage.getItem('user_profile');
        if (settingsRaw) {
          const settings = JSON.parse(settingsRaw);
          setIsAnonymous(settings.anonymous ?? false);
          if (settings.username) setUserPseudonym(settings.username);
        }
        if (profileRaw) {
          const profile = JSON.parse(profileRaw);
          if (profile.username && !userPseudonym) setUserPseudonym(profile.username);
        }
      }
    } catch (error) {
      console.log('Error loading user identity:', error);
    }
  };

  const loadSavedArt = async () => {
    try {
      const data = await AsyncStorage.getItem('favorite_artworks');
      if (data) {
        const favs = JSON.parse(data);
        setSavedNewsfeedArt(new Set(favs.map(a => a.id)));
      }
    } catch (error) {
      console.log('Error loading saved art:', error);
    }
  };

  // Load real community newsfeed from Firestore
  const loadNewsfeed = async () => {
    if (!user) return;
    setNewsfeedLoading(true);
    try {
      // Load seen tapestries from AsyncStorage
      const seenRaw = await AsyncStorage.getItem('seen_tapestries');
      const seen = seenRaw ? JSON.parse(seenRaw) : {};
      setSeenTapestries(seen);

      const grouped = await getAllCuratedGalleriesGrouped(user.uid);
      console.log('[Community] Newsfeed loaded:', grouped.length, 'users with curations');
      grouped.forEach(u => console.log(`  - ${u.pseudonym}: ${u.artworks.length} works`));
      setNewsfeedUsers(grouped);

      // Batch-fetch win counts for all feed users
      const winResults = await Promise.all(
        grouped.map(async (u) => {
          try {
            const count = await getUserWinCount(u.uid);
            return [u.uid, count];
          } catch { return [u.uid, 0]; }
        })
      );
      const wins = {};
      winResults.forEach(([uid, count]) => { wins[uid] = count; });
      setFeedUserWins(wins);

      trackAction('newsfeed_loaded');
    } catch (error) {
      console.log('Error loading newsfeed:', error);
    } finally {
      setNewsfeedLoading(false);
    }
  };

  // Load artworks of mine that others have saved (curated + courages)
  const loadMyInspiringWorks = async () => {
    if (!user) return;
    setInspiringWorksLoading(true);
    try {
      const [saves, myCurated, myCourages] = await Promise.all([
        getMyArtSaves(user.uid),
        getUserCurated(user.uid),
        getUserCourages(user.uid),
      ]);

      // Group saves by artworkId
      const grouped = {};
      for (const save of saves) {
        if (!grouped[save.artworkId]) {
          grouped[save.artworkId] = { artworkId: save.artworkId, savers: [] };
        }
        grouped[save.artworkId].savers.push(save.saverPseudonym || 'Anonymous');
      }

      // Match with curated artworks OR courages
      const works = Object.values(grouped).map(g => {
        const curated = myCurated.find(a => a.id === g.artworkId);
        const courage = myCourages.find(a => a.id === g.artworkId);
        const source = curated || courage;
        return {
          ...g,
          artwork: source ? {
            id: source.id,
            title: source.title || 'Untitled',
            imageUrl: source.imageUrl || source.mediaUrl || null,
          } : null,
          sourceType: curated ? 'curated' : 'courage',
          saveCount: g.savers.length,
        };
      }).filter(w => w.artwork); // only show works that still exist

      setMyInspiringWorks(works);
      trackAction('inspiring_works_loaded');
    } catch (error) {
      console.log('Error loading inspiring works:', error);
    } finally {
      setInspiringWorksLoading(false);
    }
  };

  // Move pending voting artworks to private gallery after voting day passes
  const promotePendingVotingArtworks = async () => {
    try {
      const pendingData = await AsyncStorage.getItem('pending_voting_artworks');
      if (!pendingData) return;
      const pending = JSON.parse(pendingData);
      if (pending.length === 0) return;

      const today = getESTDate();
      const ready = pending.filter(a => a.votingSubmitDate < today);
      const stillPending = pending.filter(a => a.votingSubmitDate >= today);

      if (ready.length > 0) {
        // Move ready artworks to private gallery (with dedup)
        const personalData = await AsyncStorage.getItem('personal_artworks');
        const personal = personalData ? JSON.parse(personalData) : [];
        const existingIds = new Set(personal.map(a => String(a.id)));
        const promoted = ready
          .filter(a => !existingIds.has(String(a.id)))
          .map(a => ({
            ...a,
            pendingVoting: false,
          }));
        const updatedPersonal = [...personal, ...promoted];
        await AsyncStorage.setItem('personal_artworks', JSON.stringify(updatedPersonal));
        setPersonalArtworks(updatedPersonal);

        await AsyncStorage.setItem('pending_voting_artworks', JSON.stringify(stillPending));
        setPendingVotingArtworks(stillPending);
      }
    } catch (error) {
      console.log('Error promoting pending artworks:', error);
    }
  };

  const handleCandleSave = async (artwork, curatorUid) => {
    try {
      const existing = await AsyncStorage.getItem('favorite_artworks');
      let favorites = existing ? JSON.parse(existing) : [];
      const artId = artwork.docId || artwork.id;
      const alreadySaved = favorites.some(a => a.id === artId);

      if (alreadySaved) {
        // Move removed inspiration to Second Thoughts (24h recovery)
        const removedItem = favorites.find(a => a.id === artId);
        favorites = favorites.filter(a => a.id !== artId);
        if (removedItem) {
          const trashedItem = { ...removedItem, trashedAt: Date.now(), trashedFrom: 'inspiration' };
          const freshTrash = await AsyncStorage.getItem('trashed_artworks');
          const trashArr = freshTrash ? JSON.parse(freshTrash) : [];
          trashArr.push(trashedItem);
          await AsyncStorage.setItem('trashed_artworks', JSON.stringify(trashArr));
          setTrashedArtworks(trashArr);
        }
        setSavedNewsfeedArt(prev => {
          const next = new Set(prev);
          next.delete(artId);
          return next;
        });
        // Remove Firestore art save record
        if (user && curatorUid) {
          removeArtSave(artId, user.uid).catch(err =>
            console.log('removeArtSave error:', err)
          );
          trackAction('art_save_removed');
        }
      } else {
        favorites.push({
          id: artId,
          imageUrl: artwork.imageUrl,
          text: artwork.text || '',
          title: artwork.title || 'Untitled',
          source: 'candle_save',
          date: artwork.date,
          savedAt: new Date().toISOString(),
          ...(artwork.textStyle && { textStyle: artwork.textStyle }),
        });
        setSavedNewsfeedArt(prev => new Set(prev).add(artId));
        const today = getESTDate();
        await AsyncStorage.setItem(`inspiration_saved_${today}`, 'true');
        // Record Firestore art save
        if (user && curatorUid) {
          recordArtSave(curatorUid, artId, user.uid, userPseudonym || 'Anonymous').catch(err =>
            console.log('recordArtSave error:', err)
          );
          trackAction('art_save_recorded');
        }
      }
      await AsyncStorage.setItem('favorite_artworks', JSON.stringify(favorites));
      setInspirationArtworks(favorites);
    } catch (error) {
      console.log('Error toggling candle:', error);
    }
  };

  const handleEmailShare = async (artwork) => {
    openMailto(
      'Something that inspired me',
      'This inspired me to send to you!\n\n' +
      (artwork.title ? `"${artwork.title}"\n\n` : '') +
      '[Add your message here]\n\n— Sent from MAGIC Tracker'
    );
    const today = getESTDate();
    await AsyncStorage.setItem(`email_sent_${today}`, 'true');
  };

  const toggleFollow = async (userId) => {
    const updated = followedUsers.includes(userId)
      ? followedUsers.filter(id => id !== userId)
      : [...followedUsers, userId];
    setFollowedUsers(updated);
    await AsyncStorage.setItem('followed_users', JSON.stringify(updated));
  };

  const openCarousel = (feedUser, startIndex = 0) => {
    // Mark as connected for today's Connect (C) star point
    const today = getESTDate();
    AsyncStorage.setItem(`connected_${today}`, 'true');
    setCarouselModal({ feedUser, currentIndex: startIndex });
    // Mark this user's tapestry as seen (clears "New Inspiration" alert)
    if (feedUser?.uid) {
      const updatedSeen = { ...seenTapestries, [feedUser.uid]: feedUser.artworks.length };
      setSeenTapestries(updatedSeen);
      AsyncStorage.setItem('seen_tapestries', JSON.stringify(updatedSeen));
    }
  };

  const navigateCarousel = (direction) => {
    setCarouselModal(prev => {
      if (!prev) return prev;
      const maxIndex = prev.feedUser.artworks.length; // +1 for completion screen
      let newIndex = prev.currentIndex + direction;
      if (newIndex < 0) newIndex = 0;
      if (newIndex > maxIndex) newIndex = maxIndex;
      return { ...prev, currentIndex: newIndex };
    });
  };
  // Keep ref in sync so PanResponder can call it (avoids stale closure)
  navigateCarouselRef.current = navigateCarousel;

  // Deduplicate an array by id field
  const dedupeById = (arr) => {
    const seen = new Set();
    return arr.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  const loadAllGalleries = async () => {
    try {
      // Load local curated, then sync from Firestore to catch cross-device curations
      const publicData = await AsyncStorage.getItem('public_artworks');
      let localCurated = publicData ? JSON.parse(publicData) : [];
      localCurated = dedupeById(localCurated);
      // Enforce curated limit on load (trims any over-limit items from before limit existed)
      const curatedCap = getCuratedLimit(userProfile);
      if (localCurated.length > curatedCap) {
        localCurated = localCurated.slice(0, curatedCap);
        await AsyncStorage.setItem('public_artworks', JSON.stringify(localCurated));
      }

      // Sync own curated gallery from Firestore (ensures cross-device visibility)
      if (user?.uid) {
        try {
          const firestoreCurated = await getUserCurated(user.uid);
          if (firestoreCurated && firestoreCurated.length > 0) {
            const localIds = new Set(localCurated.map(a => String(a.id)));
            const curatedMax = getCuratedLimit(userProfile);
            const newFromServer = firestoreCurated
              .filter(a => !localIds.has(String(a.id)))
              .map(a => ({
                id: a.id,
                imageUrl: a.imageUrl || '',
                text: a.text || '',
                title: a.title || 'Untitled',
                date: a.date || a.publicDate || new Date().toISOString(),
                madePublic: true,
                isPublic: true,
                publicDate: a.publicDate || new Date().toISOString(),
                ...(a.textStyle && { textStyle: a.textStyle }),
              }));
            if (newFromServer.length > 0) {
              localCurated = [...localCurated, ...newFromServer].slice(0, curatedMax);
              await AsyncStorage.setItem('public_artworks', JSON.stringify(localCurated));
            }
          }
        } catch (syncErr) {
          console.log('Firestore curated sync error:', syncErr);
        }
      }
      setCuratedArtworks(localCurated);
      // Fix AsyncStorage if duplicates were found
      if (publicData && localCurated.length !== JSON.parse(publicData).length) {
        await AsyncStorage.setItem('public_artworks', JSON.stringify(localCurated));
      }

      // Load trash FIRST so we can filter trashed items from galleries
      const trashData = await AsyncStorage.getItem('trashed_artworks');
      let currentTrash = [];
      if (trashData) {
        const allTrashed = JSON.parse(trashData);
        if (!trashCleanedRef.current) {
          const now = Date.now();
          currentTrash = allTrashed.filter(a => now - a.trashedAt < 24 * 60 * 60 * 1000);
          if (currentTrash.length !== allTrashed.length) {
            await AsyncStorage.setItem('trashed_artworks', JSON.stringify(currentTrash));
          }
          trashCleanedRef.current = true;
        } else {
          currentTrash = allTrashed;
        }
      }
      setTrashedArtworks(currentTrash);
      const trashedIds = new Set(currentTrash.map(a => String(a.id)));

      const personalData = await AsyncStorage.getItem('personal_artworks');
      if (personalData) {
        const dedupedP = dedupeById(JSON.parse(personalData));
        const filteredP = dedupedP.filter(a => !trashedIds.has(String(a.id)));
        setPersonalArtworks(filteredP);
        if (filteredP.length !== JSON.parse(personalData).length) {
          await AsyncStorage.setItem('personal_artworks', JSON.stringify(filteredP));
        }
      } else {
        setPersonalArtworks([]);
      }

      const favData = await AsyncStorage.getItem('favorite_artworks');
      if (favData) {
        const dedupedF = dedupeById(JSON.parse(favData));
        const filteredF = dedupedF.filter(a => !trashedIds.has(String(a.id)));
        setInspirationArtworks(filteredF);
        if (filteredF.length !== JSON.parse(favData).length) {
          await AsyncStorage.setItem('favorite_artworks', JSON.stringify(filteredF));
        }
      } else {
        setInspirationArtworks([]);
      }

      // Load pending voting artworks (courages awaiting ranking)
      const pendingData = await AsyncStorage.getItem('pending_voting_artworks');
      setPendingVotingArtworks(pendingData ? JSON.parse(pendingData) : []);

      // Background: migrate any remaining data:/blob: URIs to Firebase Storage
      if (user?.uid) {
        (async () => {
          try {
            const pData = await AsyncStorage.getItem('personal_artworks');
            if (pData) {
              const { migrated, changed } = await migrateGalleryImages(JSON.parse(pData), user.uid);
              if (changed) {
                await AsyncStorage.setItem('personal_artworks', JSON.stringify(migrated));
                setPersonalArtworks(migrated);
              }
            }
            const fData = await AsyncStorage.getItem('favorite_artworks');
            if (fData) {
              const { migrated, changed } = await migrateGalleryImages(JSON.parse(fData), user.uid);
              if (changed) {
                await AsyncStorage.setItem('favorite_artworks', JSON.stringify(migrated));
                setInspirationArtworks(migrated);
              }
            }
            const cData = await AsyncStorage.getItem('public_artworks');
            if (cData) {
              const { migrated, changed } = await migrateGalleryImages(JSON.parse(cData), user.uid);
              if (changed) {
                await AsyncStorage.setItem('public_artworks', JSON.stringify(migrated));
                setCuratedArtworks(migrated);
              }
            }
          } catch (e) {
            console.log('Background migration error:', e);
          }
        })();
      }
    } catch (error) {
      console.log('Error loading galleries:', error);
    }
  };

  const handleUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission needed', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const artworkId = `personal_${Date.now()}`;
        const uri = await persistImageUri(result.assets[0].uri, user?.uid, artworkId);
        const newArtwork = {
          id: artworkId,
          imageUrl: uri,
          title: `My Art ${personalArtworks.length + 1}`,
          date: getESTDate(),
          savedAt: new Date().toISOString(),
          source: 'upload',
        };

        const updated = [...personalArtworks, newArtwork];
        setPersonalArtworks(updated);
        await AsyncStorage.setItem('personal_artworks', JSON.stringify(updated));
        showAlert('Uploaded!', 'Your artwork has been added to The Vault.');
      }
    } catch (error) {
      console.log('Error uploading image:', error);
      showAlert('Error', 'Could not upload image. Please try again.');
    }
  };

  // Toggle artwork in/out of curated gallery
  const handleToggleCurate = async (artwork, fromGallery) => {
    try {
      const isCurated = curatedArtworks.some(a => a.id === artwork.id);

      if (isCurated) {
        // Remove from curated
        const updatedCurated = curatedArtworks.filter(a => a.id !== artwork.id);
        setCuratedArtworks(updatedCurated);
        await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedCurated));
        trackAction('artwork_uncurated');
        // Remove from Firestore curated
        if (user) {
          removeCuratedWork(user.uid, String(artwork.id)).catch(err =>
            console.log('Firestore remove curated error:', err)
          );
        }

        // Update flags in source gallery
        if (fromGallery === 'personal') {
          const updated = personalArtworks.map(a =>
            a.id === artwork.id ? { ...a, madePublic: false } : a
          );
          setPersonalArtworks(updated);
          await AsyncStorage.setItem('personal_artworks', JSON.stringify(updated));
        } else if (fromGallery === 'inspiration') {
          const updated = inspirationArtworks.map(a =>
            a.id === artwork.id ? { ...a, isPublic: false } : a
          );
          setInspirationArtworks(updated);
          await AsyncStorage.setItem('favorite_artworks', JSON.stringify(updated));
        }
      } else {
        // Check curated limit — read from AsyncStorage to avoid stale state from rapid taps
        const curatedMax = getCuratedLimit(userProfile);
        const freshCuratedData = await AsyncStorage.getItem('public_artworks');
        const freshCuratedList = freshCuratedData ? JSON.parse(freshCuratedData) : [];
        if (freshCuratedList.length >= curatedMax) {
          const msg = curatedMax < 25
            ? `Free accounts can curate up to ${curatedMax} works. Upgrade to premium for 25 slots!`
            : 'You can only have 25 works in your tapestry. Remove one first.';
          showAlert('Tapestry Full', msg);
          return;
        }
        // Add to curated
        const curatedArt = {
          ...artwork,
          madePublic: true,
          isPublic: true,
          publicDate: new Date().toISOString(),
        };
        const updatedCurated = [...freshCuratedList, curatedArt];
        setCuratedArtworks(updatedCurated);
        await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedCurated));
        trackAction('artwork_curated');
        // Sync to Firestore curated — upload image to Storage so other users can see it
        if (user) {
          (async () => {
            try {
              let remoteImageUrl = curatedArt.imageUrl || '';
              // Upload to Firebase Storage if image is a local/data URI (not already a remote URL)
              if (remoteImageUrl && !remoteImageUrl.startsWith('https://')) {
                const storagePath = `curated/${user.uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
                remoteImageUrl = await uploadMediaToStorage(remoteImageUrl, storagePath);
              }
              await saveCuratedWork(user.uid, {
                ...curatedArt,
                imageUrl: remoteImageUrl,
                pseudonym: userProfile?.pseudonym || '',
              });
            } catch (err) {
              console.log('Firestore save curated error:', err);
            }
          })();
        }

        // Update flags in source gallery
        if (fromGallery === 'personal') {
          const updated = personalArtworks.map(a =>
            a.id === artwork.id ? { ...a, madePublic: true } : a
          );
          setPersonalArtworks(updated);
          await AsyncStorage.setItem('personal_artworks', JSON.stringify(updated));
        } else if (fromGallery === 'inspiration') {
          const updated = inspirationArtworks.map(a =>
            a.id === artwork.id ? { ...a, isPublic: true } : a
          );
          setInspirationArtworks(updated);
          await AsyncStorage.setItem('favorite_artworks', JSON.stringify(updated));
        }
      }
    } catch (error) {
      console.log('Error toggling curate:', error);
    }
  };

  // ─── Tapestry swap: replace a curated piece with one from Vault ───
  const handleTapestrySwap = (newArtwork, oldIndex) => {
    const oldArtwork = curatedArtworks[oldIndex];
    if (!oldArtwork) return;

    showConfirm(
      'Swap Artwork',
      'Replace this tapestry piece with the selected artwork?',
      async () => {
        try {
          // Remove old from curated in Firestore
          if (user) {
            removeCuratedWork(user.uid, String(oldArtwork.id)).catch(err =>
              console.log('Firestore remove curated (swap) error:', err)
            );
          }

          // Build the new curated artwork
          const curatedNew = {
            ...newArtwork,
            madePublic: true,
            isPublic: true,
            publicDate: new Date().toISOString(),
          };

          // Replace in local array
          const updatedCurated = [...curatedArtworks];
          updatedCurated[oldIndex] = curatedNew;
          setCuratedArtworks(updatedCurated);
          await AsyncStorage.setItem('public_artworks', JSON.stringify(updatedCurated));

          // Save new to Firestore curated (with Storage upload if needed)
          if (user) {
            (async () => {
              try {
                let remoteImageUrl = curatedNew.imageUrl || '';
                if (remoteImageUrl && !remoteImageUrl.startsWith('https://')) {
                  const storagePath = `curated/${user.uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
                  remoteImageUrl = await uploadMediaToStorage(remoteImageUrl, storagePath);
                }
                await saveCuratedWork(user.uid, {
                  ...curatedNew,
                  imageUrl: remoteImageUrl,
                  pseudonym: userProfile?.pseudonym || '',
                });
              } catch (err) {
                console.log('Firestore save curated (swap) error:', err);
              }
            })();
          }

          trackAction('tapestry_swap');
          setTapestrySwapModal(null);
        } catch (error) {
          console.log('Error swapping tapestry artwork:', error);
        }
      }
    );
  };

  // Restore artwork from trash back to its original gallery (batched write)
  const handleRestoreFromTrash = async (artwork) => {
    try {
      const freshTrash = await AsyncStorage.getItem('trashed_artworks');
      const trashArr = freshTrash ? JSON.parse(freshTrash) : [];
      const updatedTrash = trashArr.filter(a => a.id !== artwork.id);

      const restoredItem = { ...artwork };
      delete restoredItem.trashedAt;
      delete restoredItem.trashedFrom;

      const galleryKey = artwork.trashedFrom === 'personal' ? 'personal_artworks' : 'favorite_artworks';
      const freshData = await AsyncStorage.getItem(galleryKey);
      const galleryArr = freshData ? JSON.parse(freshData) : [];
      galleryArr.push(restoredItem);

      // Single batched write: trash + gallery updated together
      await AsyncStorage.multiSet([
        ['trashed_artworks', JSON.stringify(updatedTrash)],
        [galleryKey, JSON.stringify(galleryArr)],
      ]);

      setTrashedArtworks(updatedTrash);
      if (artwork.trashedFrom === 'personal') {
        setPersonalArtworks(galleryArr);
      } else {
        setInspirationArtworks(galleryArr);
        setSavedNewsfeedArt(prev => new Set(prev).add(artwork.id));
      }
      showAlert('Restored', 'Artwork has been restored to your gallery.');
    } catch (e) {
      console.log('Error restoring from trash:', e);
    }
  };

  const handleDeleteArtwork = (artwork, fromGallery) => {
    showDestructiveConfirm(
      'Remove Artwork',
      fromGallery === 'curated'
        ? 'Remove this from your tapestry?'
        : fromGallery === 'inspiration'
        ? 'Remove this inspiration? You can recover it from Second Thoughts within 24 hours.'
        : 'This will be moved to trash. You can recover it within 24 hours.',
      async () => {
        try {
          if (fromGallery === 'personal') {
            const freshData = await AsyncStorage.getItem('personal_artworks');
            const freshArr = freshData ? JSON.parse(freshData) : [];
            const updated = freshArr.filter(a => a.id !== artwork.id);
            const trashedItem = { ...artwork, trashedAt: Date.now(), trashedFrom: 'personal' };
            const freshTrash = await AsyncStorage.getItem('trashed_artworks');
            const trashArr = freshTrash ? JSON.parse(freshTrash) : [];
            trashArr.push(trashedItem);
            // Batched write: gallery + trash updated atomically
            await AsyncStorage.multiSet([
              ['personal_artworks', JSON.stringify(updated)],
              ['trashed_artworks', JSON.stringify(trashArr)],
            ]);
            setPersonalArtworks(updated);
            setTrashedArtworks(trashArr);
            // NOTE: Does NOT touch curated or inspiration — galleries are independent
          } else if (fromGallery === 'inspiration') {
            const freshData = await AsyncStorage.getItem('favorite_artworks');
            const freshArr = freshData ? JSON.parse(freshData) : [];
            const updated = freshArr.filter(a => a.id !== artwork.id);
            const trashedItem = { ...artwork, trashedAt: Date.now(), trashedFrom: 'inspiration' };
            const freshTrash = await AsyncStorage.getItem('trashed_artworks');
            const trashArr = freshTrash ? JSON.parse(freshTrash) : [];
            trashArr.push(trashedItem);
            // Batched write: gallery + trash updated atomically
            await AsyncStorage.multiSet([
              ['favorite_artworks', JSON.stringify(updated)],
              ['trashed_artworks', JSON.stringify(trashArr)],
            ]);
            setInspirationArtworks(updated);
            setTrashedArtworks(trashArr);
            setSavedNewsfeedArt(prev => {
              const next = new Set(prev);
              next.delete(artwork.id);
              return next;
            });
            // NOTE: Does NOT touch curated or personal — galleries are independent
          } else if (fromGallery === 'curated') {
            // Curated deletes immediately (no trash — it's a public gallery)
            const freshData = await AsyncStorage.getItem('public_artworks');
            const freshCurated = freshData ? JSON.parse(freshData) : [];
            const updated = freshCurated.filter(a => a.id !== artwork.id);
            setCuratedArtworks(updated);
            await AsyncStorage.setItem('public_artworks', JSON.stringify(updated));
            if (user) {
              removeCuratedWork(user.uid, String(artwork.id)).catch(err =>
                console.log('Firestore delete curated error:', err)
              );
            }
            // NOTE: Does NOT touch personal or inspiration — galleries are independent
          }
        } catch (error) {
          console.log('Error deleting artwork:', error);
        }
      },
      'Remove'
    );
  };

  // Bulk-trash all red-X-marked items from private gallery
  const handleTrashMarkedItems = () => {
    const marked = personalArtworks.filter(a => markedForDeletion.has(a.id));
    if (marked.length === 0) {
      showAlert('Nothing Marked', 'Tap the green ✓ on items to mark them with a red ✕ for removal.');
      return;
    }
    showConfirm(
      'Trash Marked Items',
      `This will move ${marked.length} red ✕ item${marked.length > 1 ? 's' : ''} to your trash.\n\nYou will have 24 hours to recover them before they are permanently deleted.\n\nAre you sure?`,
      async () => {
        try {
          const markedIds = new Set(marked.map(a => a.id));
          const kept = personalArtworks.filter(a => !markedIds.has(a.id));

          // Build trash entries
          const freshTrash = await AsyncStorage.getItem('trashed_artworks');
          const trashArr = freshTrash ? JSON.parse(freshTrash) : [];
          const now = Date.now();
          marked.forEach(a => {
            trashArr.push({ ...a, trashedAt: now, trashedFrom: 'personal' });
          });

          // Single batched write
          await AsyncStorage.multiSet([
            ['personal_artworks', JSON.stringify(kept)],
            ['trashed_artworks', JSON.stringify(trashArr)],
          ]);
          setPersonalArtworks(kept);
          setTrashedArtworks(trashArr);
          setMarkedForDeletion(new Set()); // Clear all marks

          showAlert('Moved to Trash', `${marked.length} item${marked.length > 1 ? 's' : ''} moved to trash. You can restore them within 24 hours from the Trash section below.`);
        } catch (e) {
          console.log('Error trashing marked items:', e);
        }
      },
      'Yes, Trash'
    );
  };

  const handleResearchArticle = (url, title) => {
    showConfirm(
      title,
      'Open this article in your browser?',
      () => Linking.openURL(url),
      'Open'
    );
  };

  const getArtworkImageSource = (artwork) => {
    if (artwork.imageUrl) return { uri: artwork.imageUrl };
    return null;
  };

  const researchArticles = [
    {
      title: '120 Minutes of Art Per Week',
      description: 'Study shows creative activities improve mental health',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4937104/'
    },
    {
      title: 'The Psychology of Creativity',
      description: 'How creative expression affects wellbeing',
      url: 'https://www.psychologytoday.com/us/basics/creativity'
    },
    {
      title: 'Art Therapy Research',
      description: 'Benefits of regular artistic practice',
      url: 'https://www.arttherapy.org/research/'
    }
  ];

  // ─── Gallery Item with candle + curate toggle ───
  const renderGalleryItem = (artwork, fromGallery) => {
    const imageSource = getArtworkImageSource(artwork);
    const hasText = artwork.text && artwork.text.trim().length > 0;
    const isCurated = curatedArtworks.some(a => a.id === artwork.id);
    const isPrivateGallery = fromGallery === 'personal' || fromGallery === 'inspiration';

    const handleFramePress = () => {
      if (imageSource) {
        setFullViewImage({ source: imageSource, artwork });
      } else if (hasText) {
        setFullViewText({ text: artwork.text, title: artwork.title, textStyle: artwork.textStyle });
      }
    };

    return (
      <View key={artwork.id} style={styles.galleryItemContainer}>
        <GoldFrame
          onPress={handleFramePress}
          thickness={3}
        >
          {imageSource ? (
            <View style={styles.galleryImageBg}>
              <Image source={imageSource} style={styles.galleryImage} resizeMode="contain" />
            </View>
          ) : hasText ? (
            <View style={[styles.galleryImageBg, styles.textArtBg]}>
              <ScrollView contentContainerStyle={styles.textArtScroll} showsVerticalScrollIndicator={false}>
                <Text style={[
                  styles.textArtContent,
                  artwork.textStyle && {
                    fontFamily: artwork.textStyle.fontFamily,
                    fontWeight: artwork.textStyle.fontWeight,
                    fontStyle: artwork.textStyle.fontStyle,
                    textDecorationLine: artwork.textStyle.textDecorationLine,
                    textAlign: artwork.textStyle.textAlign,
                    color: artwork.textStyle.color,
                  },
                ]} numberOfLines={12}>{artwork.text}</Text>
              </ScrollView>
              {artwork.title ? (
                <Text style={styles.textArtTitle}>{artwork.title}</Text>
              ) : null}
            </View>
          ) : (
            <View style={[styles.galleryImageBg, styles.placeholderArt]}>
              <Text style={styles.placeholderEmoji}>🎨</Text>
              <Text style={styles.placeholderLabel}>{artwork.title || 'Artwork'}</Text>
            </View>
          )}
        </GoldFrame>

        {/* Actions row: candle + curate toggle + delete */}
        <View style={styles.artworkActions}>
          <Candle
            lit={savedNewsfeedArt.has(artwork.id)}
            onPress={() => handleCandleSave(artwork)}
            size={28}
          />

          {isPrivateGallery && (
            <TouchableOpacity
              style={[styles.curateBtn, isCurated && styles.curateBtnActive, !canCurate && styles.curateBtnDisabled]}
              onPress={() => {
                if (!canCurate) {
                  showAlert('Gallery Locked', `Your tapestry unlocks on Day 13. You are on Day ${getMemberDayCount()}.`);
                  trackAction('curate_blocked_day_gate');
                  return;
                }
                handleToggleCurate(artwork, fromGallery);
              }}
            >
              <Text style={styles.curateBtnText}>
                {!canCurate ? '🔒 Day 13' : (isCurated ? '🧵 Tapestry' : '🖼️ Vault')}
              </Text>
            </TouchableOpacity>
          )}

          {artwork.pendingVoting && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Voting</Text>
            </View>
          )}

          {isPrivateGallery && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteArtwork(artwork, fromGallery)}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {artwork.date && (
          <Text style={styles.artworkDate}>{artwork.title || artwork.date}</Text>
        )}
      </View>
    );
  };

  // ─── Curated gallery item (with candle, no curate toggle) ───
  const renderCuratedItem = (artwork) => {
    const imageSource = getArtworkImageSource(artwork);
    const hasText = artwork.text && artwork.text.trim().length > 0;

    const handleFramePress = () => {
      if (imageSource) {
        setFullViewImage({ source: imageSource, artwork });
      } else if (hasText) {
        setFullViewText({ text: artwork.text, title: artwork.title, textStyle: artwork.textStyle });
      }
    };

    return (
      <View key={artwork.id} style={styles.galleryItemContainer}>
        <GoldFrame
          onPress={handleFramePress}
          thickness={3}
        >
          {imageSource ? (
            <View style={styles.galleryImageBg}>
              <Image source={imageSource} style={styles.galleryImage} resizeMode="contain" />
            </View>
          ) : hasText ? (
            <View style={[styles.galleryImageBg, styles.textArtBg]}>
              <ScrollView contentContainerStyle={styles.textArtScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.textArtContent} numberOfLines={12}>{artwork.text}</Text>
              </ScrollView>
            </View>
          ) : (
            <View style={[styles.galleryImageBg, styles.placeholderArt]}>
              <Text style={styles.placeholderEmoji}>🎨</Text>
            </View>
          )}
        </GoldFrame>

        <Text style={styles.curatedTitle}>{artwork.title || 'Untitled'}</Text>
        <Text style={styles.curatedArtist}>
          {isAnonymous ? 'Anonymous' : (userPseudonym || 'Anonymous')}
        </Text>

        <View style={styles.artworkActions}>
          <Candle
            lit={savedNewsfeedArt.has(artwork.id)}
            onPress={() => handleCandleSave(artwork)}
            size={28}
          />
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteArtwork(artwork, 'curated')}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Render a single thumbnail in the horizontal strip ───
  const renderThumbnail = (artwork, index, feedUser) => {
    const imageSource = getArtworkImageSource(artwork);
    const hasText = artwork.text && artwork.text.trim().length > 0;

    return (
      <TouchableOpacity
        key={artwork.docId || artwork.id || index}
        style={styles.thumbWrapper}
        onPress={() => openCarousel(feedUser, index)}
        activeOpacity={0.8}
      >
        <GoldFrame thickness={3} style={styles.thumbFrameInner}>
          {imageSource ? (
            <View style={styles.thumbImageBg}>
              <Image source={imageSource} style={styles.thumbImage} resizeMode="cover" />
            </View>
          ) : hasText ? (
            <View style={[styles.thumbImageBg, styles.textArtBg]}>
              <Text style={[
                styles.thumbTextContent,
                artwork.textStyle && {
                  fontFamily: artwork.textStyle.fontFamily,
                  color: artwork.textStyle.color,
                },
              ]} numberOfLines={4}>{artwork.text}</Text>
            </View>
          ) : (
            <View style={[styles.thumbImageBg, styles.placeholderArt]}>
              <Text style={{ fontSize: 24 }}>🎨</Text>
            </View>
          )}
        </GoldFrame>
      </TouchableOpacity>
    );
  };

  // ─── Newsfeed (Visit Curations) ───
  const renderNewsfeed = () => {
    if (newsfeedLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading community curations...</Text>
        </View>
      );
    }

    if (newsfeedUsers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🖼️</Text>
          <Text style={styles.emptyText}>
            No tapestries to explore yet.{'\n'}Community members' curios will appear here!
          </Text>
        </View>
      );
    }

    return newsfeedUsers.map((feedUser) => {
      const isFollowed = followedUsers.includes(feedUser.uid);
      const firstLetter = (feedUser.pseudonym || 'A').charAt(0).toUpperCase();
      const hasNewInspiration = seenTapestries[feedUser.uid] !== feedUser.artworks.length;

      return (
        <View key={feedUser.uid} style={styles.newsfeedCard}>
          {/* Header: avatar + pseudonym + follow */}
          <View style={styles.newsfeedHeader}>
            <View style={styles.newsfeedUserInfo}>
              {feedUser.profileImageUrl ? (
                <Image source={{ uri: feedUser.profileImageUrl }} style={styles.newsfeedAvatarImage} />
              ) : (
                <View style={styles.newsfeedAvatarCircle}>
                  <Text style={styles.newsfeedAvatarLetter}>{firstLetter}</Text>
                </View>
              )}
              <View>
                <Text style={styles.newsfeedUsername}>
                  {feedUserWins[feedUser.uid] > 0 ? '🏆 ' : ''}{feedUser.pseudonym}
                </Text>
                <Text style={styles.newsfeedArtCount}>
                  {feedUser.artworks.length} artwork{feedUser.artworks.length !== 1 ? 's' : ''}
                </Text>
                {hasNewInspiration && (
                  <Text style={styles.newInspirationAlert}>✨ New Inspiration</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.followBtn, isFollowed && styles.followBtnActive]}
              onPress={() => toggleFollow(feedUser.uid)}
            >
              <Text style={[styles.followBtnText, isFollowed && styles.followBtnTextActive]}>
                {isFollowed ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal thumbnail strip with arrows */}
          <View style={styles.curioStripRow}>
            {feedUser.artworks.length > 3 && (
              <TouchableOpacity
                style={styles.curioArrow}
                onPress={() => {
                  const uid = feedUser.uid;
                  const cur = curioScrollOffsets.current[uid] || 0;
                  const next = Math.max(0, cur - CURIO_SCROLL_STEP);
                  curioScrollRefs.current[uid]?.scrollTo({ x: next, animated: true });
                  curioScrollOffsets.current[uid] = next;
                }}
              >
                <Text style={styles.curioArrowText}>‹</Text>
              </TouchableOpacity>
            )}
            <ScrollView
              ref={ref => { curioScrollRefs.current[feedUser.uid] = ref; }}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbStrip}
              onScroll={e => { curioScrollOffsets.current[feedUser.uid] = e.nativeEvent.contentOffset.x; }}
              scrollEventThrottle={16}
              style={styles.curioStripScroll}
            >
              {[...feedUser.artworks]
                .sort((a, b) => {
                  const aT = a.publicDate || a.date || '';
                  const bT = b.publicDate || b.date || '';
                  return bT > aT ? 1 : bT < aT ? -1 : 0;
                })
                .map((artwork, i) => renderThumbnail(artwork, i, feedUser))}
            </ScrollView>
            {feedUser.artworks.length > 3 && (
              <TouchableOpacity
                style={styles.curioArrow}
                onPress={() => {
                  const uid = feedUser.uid;
                  const cur = curioScrollOffsets.current[uid] || 0;
                  const next = cur + CURIO_SCROLL_STEP;
                  curioScrollRefs.current[uid]?.scrollTo({ x: next, animated: true });
                  curioScrollOffsets.current[uid] = next;
                }}
              >
                <Text style={styles.curioArrowText}>›</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.thumbHint}>Tap to view full size</Text>
        </View>
      );
    });
  };

  // ─── Render "My Inspiring Works" tab ───
  const renderInspiringWorks = () => {
    if (inspiringWorksLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading...</Text>
        </View>
      );
    }

    if (myInspiringWorks.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💫</Text>
          <Text style={styles.emptyText}>
            None of your tapestry works have been saved yet.{'\n'}Keep creating and sharing!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.galleryGrid}>
        {myInspiringWorks.map(item => {
          const imageSource = getArtworkImageSource(item.artwork);
          const isExpanded = expandedSaveCounts[item.artworkId];
          return (
            <View key={item.artworkId} style={styles.galleryItemContainer}>
              <GoldFrame
                onPress={() => imageSource && setFullViewImage({ source: imageSource, artwork: item.artwork })}
                thickness={3}
              >
                {imageSource ? (
                  <View style={styles.galleryImageBg}>
                    <Image source={imageSource} style={styles.galleryImage} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={[styles.galleryImageBg, styles.placeholderArt]}>
                    <Text style={styles.placeholderEmoji}>🎨</Text>
                  </View>
                )}
              </GoldFrame>
              <Text style={styles.curatedTitle}>{item.artwork.title || 'Untitled'}</Text>
              <TouchableOpacity
                style={styles.saveCountBadge}
                onPress={() => {
                  setExpandedSaveCounts(prev => ({
                    ...prev,
                    [item.artworkId]: !prev[item.artworkId],
                  }));
                  trackAction('save_count_tapped');
                }}
              >
                <Text style={styles.saveCountText}>
                  {item.saveCount} save{item.saveCount !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.saversList}>
                  {item.savers.map((name, i) => (
                    <Text key={i} style={styles.saverName}>{name}</Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Single-column gallery item for side-by-side private tab ───
  const renderColumnItem = (artwork, fromGallery) => {
    const imageSource = getArtworkImageSource(artwork);
    const hasText = artwork.text && artwork.text.trim().length > 0;
    const isCurated = curatedArtworks.some(a => a.id === artwork.id);
    const isPrivateGallery = fromGallery === 'personal' || fromGallery === 'inspiration';

    const handleFramePress = () => {
      if (imageSource) {
        setFullViewImage({ source: imageSource, artwork });
      } else if (hasText) {
        setFullViewText({ text: artwork.text, title: artwork.title, textStyle: artwork.textStyle });
      }
    };

    return (
      <View key={artwork.id} style={styles.columnItem}>
        <GoldFrame
          onPress={handleFramePress}
          thickness={3}
        >
          {imageSource ? (
            <View style={styles.columnImageBg}>
              <Image source={imageSource} style={styles.galleryImage} resizeMode="contain" />
            </View>
          ) : hasText ? (
            <View style={[styles.columnImageBg, styles.textArtBg]}>
              <ScrollView contentContainerStyle={styles.textArtScroll} showsVerticalScrollIndicator={false}>
                <Text style={[
                  styles.textArtContent,
                  artwork.textStyle && {
                    fontFamily: artwork.textStyle.fontFamily,
                    fontWeight: artwork.textStyle.fontWeight,
                    fontStyle: artwork.textStyle.fontStyle,
                    textDecorationLine: artwork.textStyle.textDecorationLine,
                    textAlign: artwork.textStyle.textAlign,
                    color: artwork.textStyle.color,
                  },
                ]} numberOfLines={8}>{artwork.text}</Text>
              </ScrollView>
              {artwork.title ? (
                <Text style={styles.textArtTitle}>{artwork.title}</Text>
              ) : null}
            </View>
          ) : (
            <View style={[styles.columnImageBg, styles.placeholderArt]}>
              <Text style={styles.placeholderEmoji}>🎨</Text>
              <Text style={styles.placeholderLabel}>{artwork.title || 'Artwork'}</Text>
            </View>
          )}
        </GoldFrame>

        {/* Actions row */}
        <View style={styles.artworkActions}>
          {/* Left: green check / red X toggle (personal gallery only) */}
          {fromGallery === 'personal' && (
            <TouchableOpacity
              style={[
                styles.markToggleBtn,
                markedForDeletion.has(artwork.id) && styles.markToggleBtnMarked,
              ]}
              onPress={() => {
                setMarkedForDeletion(prev => {
                  const next = new Set(prev);
                  if (next.has(artwork.id)) {
                    next.delete(artwork.id);
                  } else {
                    next.add(artwork.id);
                  }
                  return next;
                });
              }}
            >
              <Text style={markedForDeletion.has(artwork.id) ? styles.markToggleX : styles.markToggleCheck}>
                {markedForDeletion.has(artwork.id) ? '✕' : '✓'}
              </Text>
            </TouchableOpacity>
          )}

          {isPrivateGallery && (
            <TouchableOpacity
              style={[styles.curateBtn, isCurated && styles.curateBtnActive, !canCurate && styles.curateBtnDisabled]}
              onPress={() => {
                if (!canCurate) {
                  showAlert('Gallery Locked', `Your tapestry unlocks on Day 13. You are on Day ${getMemberDayCount()}.`);
                  trackAction('curate_blocked_day_gate');
                  return;
                }
                handleToggleCurate(artwork, fromGallery);
              }}
            >
              <Text style={styles.curateBtnText}>
                {!canCurate ? '🔒 Day 13' : (isCurated ? '🧵 Tapestry' : '🖼️ Vault')}
              </Text>
            </TouchableOpacity>
          )}

          <Candle
            lit={savedNewsfeedArt.has(artwork.id)}
            onPress={() => handleCandleSave(artwork)}
            size={24}
          />
        </View>

        {artwork.date && (
          <Text style={styles.artworkDate}>{artwork.title || artwork.date}</Text>
        )}
      </View>
    );
  };

  // ─── Gallery content switcher ───
  const renderGalleryContent = () => {
    switch (activeGallery) {
      case 'newsfeed':
        return renderNewsfeed();

      case 'curated':
        if (!canCurate) {
          const dayCount = getMemberDayCount();
          return (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔒</Text>
              <Text style={styles.emptyText}>
                Your tapestry unlocks on Day 13.{'\n'}You are on Day {dayCount} — keep going!
              </Text>
            </View>
          );
        }
        return curatedArtworks.length > 0 ? (
          <View>
            <View style={styles.curatedThumbGrid}>
              {curatedArtworks.map((artwork, index) => {
                const imageSource = getArtworkImageSource(artwork);
                const hasText = artwork.text && artwork.text.trim().length > 0;
                return (
                  <TouchableOpacity
                    key={artwork.id}
                    style={styles.curatedThumbItem}
                    onPress={() => setTapestrySwapModal({ artwork, index })}
                    onLongPress={() => {
                      showDestructiveConfirm(
                        'Remove from Tapestry',
                        'Remove this from your tapestry?',
                        () => handleDeleteArtwork(artwork, 'curated'),
                        'Remove'
                      );
                    }}
                  >
                    <GoldFrame thickness={2}>
                      {imageSource ? (
                        <Image source={imageSource} style={styles.curatedThumbImage} resizeMode="cover" />
                      ) : hasText ? (
                        <View style={[styles.curatedThumbImage, styles.textArtBg]}>
                          <Text style={{ color: '#333', fontSize: 8 }} numberOfLines={4}>{artwork.text}</Text>
                        </View>
                      ) : (
                        <View style={[styles.curatedThumbImage, styles.placeholderArt]}>
                          <Text style={{ fontSize: 16 }}>🎨</Text>
                        </View>
                      )}
                    </GoldFrame>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.curatedThumbHint}>Tap to swap  •  Long press to unweave</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🖼️</Text>
            <Text style={styles.emptyText}>
              Your tapestry is empty.{'\n'}Go to The Vault and tap the curate button to add artworks!
            </Text>
          </View>
        );

      case 'inspiring': {
        const toMsI = (val) => {
          if (!val) return 0;
          if (typeof val === 'number') return val;
          if (val.toMillis) return val.toMillis();
          const parsed = new Date(val).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };
        const sortedInspirations = [...inspirationArtworks].sort((a, b) => {
          const aTime = toMsI(a.savedAt) || toMsI(a.date) || a.id || 0;
          const bTime = toMsI(b.savedAt) || toMsI(b.date) || b.id || 0;
          return bTime - aTime;
        });

        // Build grid items: inspirations fill first, bookshelf goes in top-right (position index 2)
        const inspirationItems = sortedInspirations.map((artwork, i) => ({ type: 'art', artwork, key: artwork.id }));
        // Insert bookshelf at index 3 (second row, right spot) if enough items, otherwise append
        const bookshelfItem = { type: 'bookshelf', key: 'bookshelf-secret' };
        const gridItems = [...inspirationItems];
        if (gridItems.length >= 3) {
          gridItems.splice(3, 0, bookshelfItem);
        } else {
          gridItems.push(bookshelfItem);
        }

        return (
          <>
            <Text style={styles.columnHeader}>My Inspirations</Text>
            <View style={styles.galleryGrid}>
              {/* Bookshelf secret passage — top row right */}
              {gridItems.map(item => {
                if (item.type === 'bookshelf') {
                  return (
                    <View key={item.key} style={styles.galleryItemContainer}>
                      <GoldFrame
                        onPress={() => {
                          setFullViewImage({
                            source: require('../assets/bookshelf-secret.png'),
                            bookshelf: true,
                          });
                          trackAction('bookshelf_secret_tapped');
                        }}
                        thickness={3}
                      >
                        <View style={styles.galleryImageBg}>
                          <Image
                            source={require('../assets/bookshelf-secret.png')}
                            style={styles.galleryImage}
                            resizeMode="cover"
                          />
                        </View>
                      </GoldFrame>
                    </View>
                  );
                }

                const { artwork } = item;
                const imageSource = getArtworkImageSource(artwork);
                const hasText = artwork.text && artwork.text.trim().length > 0;
                return (
                  <View key={artwork.id} style={styles.galleryItemContainer}>
                    <GoldFrame
                      onPress={() => {
                        if (imageSource) {
                          setFullViewImage({ source: imageSource, artwork });
                        } else if (hasText) {
                          setFullViewText({ text: artwork.text, title: artwork.title, textStyle: artwork.textStyle });
                        }
                      }}
                      onLongPress={() => handleDeleteArtwork(artwork, 'inspiration')}
                      thickness={3}
                    >
                      {imageSource ? (
                        <View style={styles.galleryImageBg}>
                          <Image source={imageSource} style={styles.galleryImage} resizeMode="contain" />
                        </View>
                      ) : hasText ? (
                        <View style={[styles.galleryImageBg, styles.textArtBg]}>
                          <Text style={styles.textArtContent} numberOfLines={8}>{artwork.text}</Text>
                        </View>
                      ) : (
                        <View style={[styles.galleryImageBg, styles.placeholderArt]}>
                          <Text style={styles.placeholderEmoji}>🎨</Text>
                        </View>
                      )}
                    </GoldFrame>

                    {/* Actions row: nameplate + candle (no green circle) */}
                    <View style={styles.artworkActions}>
                      <View style={styles.nameplateRow}>
                        <Text style={styles.nameplateTitle} numberOfLines={1}>
                          {artwork.title || 'Untitled'}
                        </Text>
                        <Text style={styles.nameplateArtist} numberOfLines={1}>
                          {artwork.pseudonym || artwork.artist || ''}
                        </Text>
                      </View>

                      <Candle
                        lit={savedNewsfeedArt.has(artwork.id)}
                        onPress={() => handleCandleSave(artwork)}
                        size={24}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
            {sortedInspirations.length === 0 && (
              <View style={styles.emptyStateSmall}>
                <Text style={styles.emptyText}>
                  No saved inspirations yet. Light the candle on artworks you love!
                </Text>
              </View>
            )}

            {/* Second Thoughts — 24h recovery for removed inspirations */}
            {(() => {
              const secondThoughts = trashedArtworks.filter(a => a.trashedFrom === 'inspiration');
              if (secondThoughts.length === 0) return null;
              return (
                <View style={styles.trashSection}>
                  <TouchableOpacity
                    style={styles.trashToggle}
                    onPress={() => setShowSecondThoughts(!showSecondThoughts)}
                  >
                    <Text style={styles.trashToggleText}>
                      Second Thoughts ({secondThoughts.length}) — {showSecondThoughts ? 'Hide' : 'Show'}
                    </Text>
                    <Text style={styles.trashHint}>Removed inspirations can be restored within 24 hours</Text>
                  </TouchableOpacity>
                  {showSecondThoughts && (
                    <View style={styles.trashGrid}>
                      {secondThoughts.map(artwork => {
                        const imageSource = getArtworkImageSource(artwork);
                        const hoursLeft = Math.max(0, Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - artwork.trashedAt)) / (60 * 60 * 1000)));
                        return (
                          <View key={artwork.id} style={styles.trashItem}>
                            {imageSource ? (
                              <Image source={imageSource} style={styles.trashImage} resizeMode="cover" />
                            ) : artwork.text ? (
                              <View style={[styles.trashImage, styles.textArtBg]}>
                                <Text style={{ color: '#333', fontSize: 10 }} numberOfLines={3}>{artwork.text}</Text>
                              </View>
                            ) : (
                              <View style={[styles.trashImage, styles.placeholderArt]}>
                                <Text style={{ fontSize: 16 }}>🎨</Text>
                              </View>
                            )}
                            <Text style={styles.trashTimer}>{hoursLeft}h left</Text>
                            <TouchableOpacity
                              style={styles.trashRestoreBtn}
                              onPress={() => handleRestoreFromTrash(artwork)}
                            >
                              <Text style={styles.trashRestoreText}>Restore</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Inspiring Others — revealed by bookshelf secret passage */}
            {showInspiringOthers && (
              <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(75,0,130,0.3)', paddingTop: 16 }}>
                <Text style={styles.columnHeader}>Inspiring Others</Text>
                {!canAccessFeature('inspiringOthers', userProfile) ? (
                  <PremiumPaywall feature="inspiringOthers" />
                ) : (
                  renderInspiringWorks()
                )}
              </View>
            )}
          </>
        );
      }

      case 'private': {
        // Sort newest first — normalize all date formats to ms
        const toMs = (val) => {
          if (!val) return 0;
          if (typeof val === 'number') return val;
          if (val.toMillis) return val.toMillis();
          const parsed = new Date(val).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };
        const sortedPersonal = [...personalArtworks].sort((a, b) => {
          const aTime = toMs(a.savedAt) || toMs(a.date) || a.id || 0;
          const bTime = toMs(b.savedAt) || toMs(b.date) || b.id || 0;
          return bTime - aTime;
        });

        return (
          <>
            {/* Link to Art Studio */}
            <Text style={styles.studioHint}>
              To add more of your art to this album, do so in the{' '}
              <Text
                style={styles.studioLink}
                onPress={() => navigation.navigate('Art')}
              >
                Art Studio
              </Text>
            </Text>

            {/* Pending voting placeholder cards */}
            {pendingVotingArtworks.length > 0 && (
              <View style={styles.galleryGrid}>
                {pendingVotingArtworks.map(artwork => (
                  <View key={`pending-${artwork.id}`} style={styles.galleryItemContainer}>
                    <GoldFrame thickness={3}>
                      <View style={[styles.galleryImageBg, { backgroundColor: 'rgba(75,0,130,0.08)' }]}>
                        <Text style={{ fontSize: 28 }}>🗳️</Text>
                        <Text style={{ color: '#4B0082', fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 4 }}>
                          In Voting
                        </Text>
                        <Text style={{ color: '#4B0082', fontSize: 9, fontStyle: 'italic', textAlign: 'center', marginTop: 2 }} numberOfLines={1}>
                          {artwork.title || 'Untitled'}
                        </Text>
                      </View>
                    </GoldFrame>
                    <View style={styles.artworkActions}>
                      <View style={styles.nameplateRow}>
                        <Text style={styles.nameplateTitle} numberOfLines={1}>
                          {artwork.title || 'Untitled'}
                        </Text>
                        <Text style={styles.nameplateArtist} numberOfLines={1}>
                          Awaiting ranking
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* My Creations list */}
            {sortedPersonal.length > 0 ? (
              <View style={styles.galleryGrid}>
                {sortedPersonal.map(artwork => {
                  const imageSource = getArtworkImageSource(artwork);
                  const hasText = artwork.text && artwork.text.trim().length > 0;
                  const isCurated = curatedArtworks.some(a => a.id === artwork.id);
                  const isMarked = markedForDeletion.has(artwork.id);
                  return (
                    <View key={artwork.id} style={styles.galleryItemContainer}>
                      <GoldFrame
                        onPress={() => {
                          if (imageSource) {
                            setFullViewImage({ source: imageSource, artwork });
                          } else if (hasText) {
                            setFullViewText({ text: artwork.text, title: artwork.title, textStyle: artwork.textStyle });
                          }
                        }}
                        thickness={3}
                      >
                        {imageSource ? (
                          <View style={styles.galleryImageBg}>
                            <Image source={imageSource} style={styles.galleryImage} resizeMode="contain" />
                          </View>
                        ) : hasText ? (
                          <View style={[styles.galleryImageBg, styles.textArtBg]}>
                            <Text style={styles.textArtContent} numberOfLines={8}>{artwork.text}</Text>
                          </View>
                        ) : (
                          <View style={[styles.galleryImageBg, styles.placeholderArt]}>
                            <Text style={styles.placeholderEmoji}>🎨</Text>
                          </View>
                        )}
                      </GoldFrame>

                      {/* Actions row: green circle + nameplate + candle */}
                      <View style={styles.artworkActions}>
                        <TouchableOpacity
                          style={[
                            styles.markToggleBtn,
                            isMarked && styles.markToggleBtnMarked,
                          ]}
                          onPress={() => {
                            setMarkedForDeletion(prev => {
                              const next = new Set(prev);
                              if (next.has(artwork.id)) next.delete(artwork.id);
                              else next.add(artwork.id);
                              return next;
                            });
                          }}
                        >
                          <Text style={isMarked ? styles.markToggleX : styles.markToggleCheck}>
                            {isMarked ? '✕' : '✓'}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.nameplateRow}>
                          <Text style={styles.nameplateTitle} numberOfLines={1}>
                            {artwork.title || 'Untitled'}
                          </Text>
                          <Text style={styles.nameplateArtist} numberOfLines={1}>
                            {artwork.pseudonym || artwork.artist || ''}
                          </Text>
                        </View>

                        <Candle
                          lit={savedNewsfeedArt.has(artwork.id)}
                          onPress={() => handleCandleSave(artwork)}
                          size={24}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔒</Text>
                <Text style={styles.emptyText}>
                  Your vault is empty. Create something in the Art Studio!
                </Text>
              </View>
            )}

            {/* Trash red-X-marked items + Trash */}
            {personalArtworks.length > 0 && (
              <TouchableOpacity
                style={[styles.clearNonCandlelitBtn, markedForDeletion.size > 0 && styles.trashMarkedBtnActive]}
                onPress={handleTrashMarkedItems}
              >
                <Text style={styles.clearNonCandlelitText}>
                  Trash ✕ Items{markedForDeletion.size > 0 ? ` (${markedForDeletion.size})` : ''}
                </Text>
              </TouchableOpacity>
            )}

            {(() => {
              const vaultTrash = trashedArtworks.filter(a => a.trashedFrom !== 'inspiration');
              if (vaultTrash.length === 0) return null;
              return (
              <View style={styles.trashSection}>
                <TouchableOpacity
                  style={styles.trashToggle}
                  onPress={() => setShowTrash(!showTrash)}
                >
                  <Text style={styles.trashToggleText}>
                    Trash ({vaultTrash.length}) — {showTrash ? 'Hide' : 'Show'}
                  </Text>
                  <Text style={styles.trashHint}>Items are permanently deleted after 24 hours</Text>
                </TouchableOpacity>
                {showTrash && (
                  <View style={styles.trashGrid}>
                    {vaultTrash.map(artwork => {
                      const imageSource = getArtworkImageSource(artwork);
                      const hoursLeft = Math.max(0, Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - artwork.trashedAt)) / (60 * 60 * 1000)));
                      return (
                        <View key={artwork.id} style={styles.trashItem}>
                          {imageSource ? (
                            <Image source={imageSource} style={styles.trashImage} resizeMode="cover" />
                          ) : artwork.text ? (
                            <View style={[styles.trashImage, styles.textArtBg]}>
                              <Text style={{ color: '#333', fontSize: 10 }} numberOfLines={3}>{artwork.text}</Text>
                            </View>
                          ) : (
                            <View style={[styles.trashImage, styles.placeholderArt]}>
                              <Text style={{ fontSize: 16 }}>🎨</Text>
                            </View>
                          )}
                          <Text style={styles.trashTimer}>{hoursLeft}h left</Text>
                          <TouchableOpacity
                            style={styles.trashRestoreBtn}
                            onPress={() => handleRestoreFromTrash(artwork)}
                          >
                            <Text style={styles.trashRestoreText}>Restore</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
              );
            })()}
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Connect</Text>
        <Text style={styles.subtitle}>Galleries & Community</Text>

        {/* 4-Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeGallery === 'newsfeed' && styles.tabActive]}
            onPress={() => setActiveGallery('newsfeed')}
          >
            <Text style={styles.tabIcon}>🖼️</Text>
            <Text style={[styles.tabLabel, activeGallery === 'newsfeed' && styles.tabLabelActive]}>
              Curios
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeGallery === 'curated' && styles.tabActive]}
            onPress={() => {
              if (!canCurate) {
                showAlert('Gallery Locked', `Your tapestry unlocks on Day 13. You are on Day ${getMemberDayCount()}.`);
                trackAction('curate_blocked_day_gate');
                return;
              }
              setActiveGallery('curated');
            }}
          >
            <Text style={styles.tabIcon}>{canCurate ? '🧶' : '🔒'}</Text>
            <Text style={[styles.tabLabel, activeGallery === 'curated' && styles.tabLabelActive]}>
              My Tapestry
            </Text>
            {canCurate && curatedArtworks.length > 0 && (
              <Text style={styles.tabCount}>{curatedArtworks.length}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeGallery === 'inspiring' && styles.tabActive]}
            onPress={() => {
              setActiveGallery('inspiring');
              loadMyInspiringWorks();
            }}
          >
            <Text style={styles.tabIcon}>💫</Text>
            <Text style={[styles.tabLabel, activeGallery === 'inspiring' && styles.tabLabelActive]}>
              Inspiring
            </Text>
            {inspirationArtworks.length > 0 && (
              <Text style={styles.tabCount}>{inspirationArtworks.length}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeGallery === 'private' && styles.tabActive]}
            onPress={() => setActiveGallery('private')}
          >
            <Text style={styles.tabIcon}>🔒</Text>
            <Text style={[styles.tabLabel, activeGallery === 'private' && styles.tabLabelActive]}>
              The Vault
            </Text>
            {(personalArtworks.length + pendingVotingArtworks.length) > 0 && (
              <Text style={styles.tabCount}>{personalArtworks.length + pendingVotingArtworks.length}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Gallery Description */}
        <Text style={styles.galleryDescription}>
          {activeGallery === 'newsfeed' && 'Explore tapestries from the community'}
          {activeGallery === 'curated' && 'Your tapestry — the works you share with the world'}
          {activeGallery === 'inspiring' && 'Your saved inspirations & art others have saved'}
          {activeGallery === 'private' && 'Your creations — only you can see these'}
        </Text>

        {/* Gallery Content */}
        <View style={styles.gallerySection}>
          {renderGalleryContent()}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full-screen image viewer */}
      <Modal
        visible={fullViewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullViewImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullViewImage(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <ScrollView
            contentContainerStyle={styles.modalImageContainer}
            maximumZoomScale={fullViewImage?.bookshelf ? 1 : 5}
            minimumZoomScale={1}
            bouncesZoom={!fullViewImage?.bookshelf}
          >
            {fullViewImage && (
              <Image
                source={fullViewImage.source}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </ScrollView>
          {fullViewImage?.bookshelf && (
            <View style={styles.bookshelfOverlay}>
              <Text style={styles.bookshelfOverlayText}>
                This room of inspiration is closed to non-members.
              </Text>
              {canAccessFeature('inspiringOthers', userProfile) ? (
                <TouchableOpacity
                  style={styles.bookshelfOverlayBtn}
                  onPress={() => {
                    setFullViewImage(null);
                    setShowInspiringOthers(true);
                    loadMyInspiringWorks();
                  }}
                >
                  <Text style={styles.bookshelfOverlayBtnText}>Enter</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.bookshelfOverlayBtn}
                  onPress={() => {
                    setFullViewImage(null);
                    navigation.navigate('PremiumSignup');
                  }}
                >
                  <Text style={styles.bookshelfOverlayBtnText}>Become a Member</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {fullViewImage?.curatorUid && (
            <View style={styles.fullViewCandleRow}>
              <Candle
                lit={savedNewsfeedArt.has(fullViewImage.artwork?.docId || fullViewImage.artwork?.id)}
                onPress={() => handleCandleSave(fullViewImage.artwork, fullViewImage.curatorUid)}
                size={44}
              />
            </View>
          )}
        </View>
      </Modal>

      {/* Full view text modal */}
      <Modal
        visible={fullViewText !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullViewText(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullViewText(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <ScrollView style={styles.fullTextScroll} contentContainerStyle={styles.fullTextContainer}>
            {fullViewText?.title ? (
              <Text style={styles.fullTextTitle}>{fullViewText.title}</Text>
            ) : null}
            <Text style={[
              styles.fullTextContent,
              fullViewText?.textStyle && {
                fontFamily: fullViewText.textStyle.fontFamily,
                fontSize: fullViewText.textStyle.fontSize,
                color: fullViewText.textStyle.color,
                fontWeight: fullViewText.textStyle.fontWeight,
                fontStyle: fullViewText.textStyle.fontStyle,
                textDecorationLine: fullViewText.textStyle.textDecorationLine,
                textAlign: fullViewText.textStyle.textAlign,
              },
            ]}>{fullViewText?.text}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Carousel modal — full-screen viewer for community curations */}
      <Modal
        visible={carouselModal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCarouselModal(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setCarouselModal(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {carouselModal && (() => {
            const artworks = carouselModal.feedUser.artworks;
            const isCompletionScreen = carouselModal.currentIndex >= artworks.length;
            const atStart = carouselModal.currentIndex === 0;
            const atEnd = isCompletionScreen;

            if (isCompletionScreen) {
              // Completion grid — mirrors My Tapestry layout (5 per row, gold frames)
              return (
                <View style={styles.carouselContent}>
                  <Text style={styles.carouselPseudonym}>{carouselModal.feedUser.pseudonym}</Text>
                  <Text style={styles.completionSubtitle}>{artworks.length} {artworks.length === 1 ? 'work' : 'works'}</Text>
                  <Text style={styles.completionTitle}>Tapestry Complete</Text>

                  <View style={styles.carouselArtRow}>
                    <TouchableOpacity
                      style={styles.carouselArrow}
                      onPress={() => navigateCarousel(-1)}
                    >
                      <Text style={styles.carouselArrowText}>‹</Text>
                    </TouchableOpacity>

                    <View style={styles.completionGrid}>
                      {artworks.map((art, i) => {
                        const imgSrc = getArtworkImageSource(art);
                        const hasText = art.text && art.text.trim().length > 0;
                        return (
                          <TouchableOpacity
                            key={art.id || i}
                            style={styles.completionThumbItem}
                            onPress={() => setCarouselModal(prev => ({ ...prev, currentIndex: i }))}
                          >
                            <GoldFrame thickness={2}>
                              {imgSrc ? (
                                <Image source={imgSrc} style={styles.completionThumbImage} resizeMode="cover" />
                              ) : hasText ? (
                                <View style={[styles.completionThumbImage, styles.textArtBg]}>
                                  <Text style={{ color: '#333', fontSize: 8 }} numberOfLines={4}>{art.text}</Text>
                                </View>
                              ) : (
                                <View style={[styles.completionThumbImage, styles.placeholderArt]}>
                                  <Text style={{ fontSize: 16 }}>🎨</Text>
                                </View>
                              )}
                            </GoldFrame>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Empty right space to balance layout */}
                    <View style={styles.carouselArrow}>
                      <Text style={[styles.carouselArrowText, { color: 'transparent' }]}>›</Text>
                    </View>
                  </View>

                  {/* Dot indicators with completion dot */}
                  <View style={styles.carouselDots}>
                    {[...Array(artworks.length + 1)].map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setCarouselModal(prev => ({ ...prev, currentIndex: i }))}
                      >
                        <View style={[
                          styles.dot,
                          i === carouselModal.currentIndex && styles.dotActive,
                          { width: 9, height: 9 },
                          i === artworks.length && styles.dotCompletion,
                        ]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            }

            // Normal single-artwork view
            const artwork = artworks[carouselModal.currentIndex];
            if (!artwork) return null;
            const imageSource = getArtworkImageSource(artwork);
            const hasText = artwork.text && artwork.text.trim().length > 0;

            return (
              <View style={styles.carouselContent}>
                {/* Pseudonym header */}
                <Text style={styles.carouselPseudonym}>{carouselModal.feedUser.pseudonym}</Text>

                {/* Main artwork display — swipeable */}
                <View style={styles.carouselArtRow} {...carouselPanResponder.panHandlers}>
                  <TouchableOpacity
                    style={[styles.carouselArrow, atStart && styles.navArrowDisabled]}
                    onPress={() => navigateCarousel(-1)}
                    disabled={atStart}
                  >
                    <Text style={[styles.carouselArrowText, atStart && { color: '#555' }]}>‹</Text>
                  </TouchableOpacity>

                  <View style={styles.carouselFrameArea}>
                    {imageSource ? (
                      <ScrollView
                        contentContainerStyle={styles.carouselImageScroll}
                        maximumZoomScale={5}
                        minimumZoomScale={1}
                        bouncesZoom={true}
                      >
                        <Image source={imageSource} style={styles.carouselImage} resizeMode="contain" />
                      </ScrollView>
                    ) : hasText ? (
                      <ScrollView style={styles.carouselTextScroll} contentContainerStyle={styles.carouselTextContainer}>
                        {artwork.title ? (
                          <Text style={styles.carouselTextTitle}>{artwork.title}</Text>
                        ) : null}
                        <Text style={[
                          styles.carouselTextContent,
                          artwork.textStyle && {
                            fontFamily: artwork.textStyle.fontFamily,
                            fontWeight: artwork.textStyle.fontWeight,
                            fontStyle: artwork.textStyle.fontStyle,
                            textDecorationLine: artwork.textStyle.textDecorationLine,
                            textAlign: artwork.textStyle.textAlign,
                            color: artwork.textStyle.color || '#fff',
                          },
                        ]}>{artwork.text}</Text>
                      </ScrollView>
                    ) : (
                      <View style={styles.carouselPlaceholder}>
                        <Text style={{ fontSize: 60 }}>🎨</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.carouselArrow, atEnd && styles.navArrowDisabled]}
                    onPress={() => navigateCarousel(1)}
                    disabled={atEnd}
                  >
                    <Text style={[styles.carouselArrowText, atEnd && { color: '#555' }]}>›</Text>
                  </TouchableOpacity>
                </View>

                {/* Title + actions */}
                <Text style={styles.carouselTitle}>{artwork.title || 'Untitled'}</Text>
                <Text style={styles.carouselCounter}>
                  {carouselModal.currentIndex + 1} of {artworks.length}
                </Text>

                <View style={styles.carouselActions}>
                  <TouchableOpacity onPress={() => handleEmailShare(artwork)}>
                    <Text style={{ fontSize: 30 }}>✉️</Text>
                  </TouchableOpacity>
                  <Candle
                    lit={savedNewsfeedArt.has(artwork.docId || artwork.id)}
                    onPress={() => handleCandleSave(artwork, carouselModal.feedUser.uid)}
                    size={44}
                  />
                </View>

                {/* Dot indicators with completion dot */}
                <View style={styles.carouselDots}>
                  {[...Array(artworks.length + 1)].map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setCarouselModal(prev => ({ ...prev, currentIndex: i }))}
                    >
                      <View style={[
                        styles.dot,
                        i === carouselModal.currentIndex && styles.dotActive,
                        { width: 9, height: 9 },
                        i === artworks.length && styles.dotCompletion,
                      ]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* Day 13 Congratulations Popup */}
      <Modal
        visible={showDay13Popup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDay13Popup(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.day13Popup}>
            <Text style={styles.day13Emoji}>🎉</Text>
            <Text style={styles.day13Title}>Congratulations!</Text>
            <Text style={styles.day13Text}>
              You've reached Day 13!{'\n'}Your tapestry is now unlocked.{'\n'}Weave your best work into your tapestry for the community to see!
            </Text>
            <TouchableOpacity
              style={styles.day13Button}
              onPress={() => {
                setShowDay13Popup(false);
                setActiveGallery('curated');
                trackAction('day_13_open_gallery');
              }}
            >
              <Text style={styles.day13ButtonText}>Open My Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.day13DismissBtn}
              onPress={() => setShowDay13Popup(false)}
            >
              <Text style={styles.day13DismissText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tapestry Swap Modal */}
      <Modal
        visible={tapestrySwapModal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTapestrySwapModal(null)}
      >
        <View style={styles.swapOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setTapestrySwapModal(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {tapestrySwapModal && (() => {
            const currentArt = tapestrySwapModal.artwork;
            const currentImage = getArtworkImageSource(currentArt);
            const hasText = currentArt.text && currentArt.text.trim().length > 0;

            // Sort vault items newest first — normalize date formats to ms
            const toMsSwap = (val) => {
              if (!val) return 0;
              if (typeof val === 'number') return val;
              if (val.toMillis) return val.toMillis();
              const parsed = new Date(val).getTime();
              return isNaN(parsed) ? 0 : parsed;
            };
            const sortedVaultPersonal = [...personalArtworks].sort((a, b) => {
              const aTime = toMsSwap(a.savedAt) || toMsSwap(a.date) || a.id || 0;
              const bTime = toMsSwap(b.savedAt) || toMsSwap(b.date) || b.id || 0;
              return bTime - aTime;
            });
            const sortedVaultInspirations = [...inspirationArtworks].sort((a, b) => {
              const aTime = toMsSwap(a.savedAt) || toMsSwap(a.date) || a.id || 0;
              const bTime = toMsSwap(b.savedAt) || toMsSwap(b.date) || b.id || 0;
              return bTime - aTime;
            });

            return (
              <View style={styles.swapContent}>
                {/* Current tapestry piece */}
                <Text style={styles.swapLabel}>Current Tapestry Piece</Text>
                <GoldFrame thickness={3} containerStyle={styles.swapCurrentFrame}>
                  {currentImage ? (
                    <Image source={currentImage} style={styles.swapCurrentImage} resizeMode="contain" />
                  ) : hasText ? (
                    <View style={[styles.swapCurrentImage, styles.textArtBg]}>
                      <Text style={{ color: '#333', fontSize: 14 }} numberOfLines={6}>{currentArt.text}</Text>
                    </View>
                  ) : (
                    <View style={[styles.swapCurrentImage, styles.placeholderArt]}>
                      <Text style={{ fontSize: 40 }}>🎨</Text>
                    </View>
                  )}
                </GoldFrame>
                <Text style={styles.swapHint}>Tap a piece below to swap in</Text>

                {/* Two columns of vault items */}
                <View style={styles.swapColumnsRow}>
                  <View style={styles.swapColumn}>
                    <Text style={styles.swapColumnHeader}>My Creations</Text>
                    <ScrollView style={styles.swapColumnScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                      <View style={styles.swapThumbGrid}>
                        {sortedVaultPersonal.map(artwork => {
                          const imgSrc = getArtworkImageSource(artwork);
                          const artHasText = artwork.text && artwork.text.trim().length > 0;
                          // Skip if already the current piece
                          if (artwork.id === currentArt.id) return null;
                          return (
                            <TouchableOpacity
                              key={artwork.id}
                              style={styles.swapThumbItem}
                              onPress={() => handleTapestrySwap(artwork, tapestrySwapModal.index)}
                            >
                              <GoldFrame thickness={2}>
                                {imgSrc ? (
                                  <Image source={imgSrc} style={styles.swapThumbImage} resizeMode="cover" />
                                ) : artHasText ? (
                                  <View style={[styles.swapThumbImage, styles.textArtBg]}>
                                    <Text style={{ color: '#333', fontSize: 6 }} numberOfLines={2}>{artwork.text}</Text>
                                  </View>
                                ) : (
                                  <View style={[styles.swapThumbImage, styles.placeholderArt]}>
                                    <Text style={{ fontSize: 10 }}>🎨</Text>
                                  </View>
                                )}
                              </GoldFrame>
                            </TouchableOpacity>
                          );
                        })}
                        {sortedVaultPersonal.length === 0 && (
                          <Text style={styles.swapEmptyText}>No creations yet</Text>
                        )}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={styles.columnDivider} />

                  <View style={styles.swapColumn}>
                    <Text style={styles.swapColumnHeader}>My Inspirations</Text>
                    <ScrollView style={styles.swapColumnScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                      <View style={styles.swapThumbGrid}>
                        {sortedVaultInspirations.map(artwork => {
                          const imgSrc = getArtworkImageSource(artwork);
                          const artHasText = artwork.text && artwork.text.trim().length > 0;
                          if (artwork.id === currentArt.id) return null;
                          return (
                            <TouchableOpacity
                              key={artwork.id}
                              style={styles.swapThumbItem}
                              onPress={() => handleTapestrySwap(artwork, tapestrySwapModal.index)}
                            >
                              <GoldFrame thickness={2}>
                                {imgSrc ? (
                                  <Image source={imgSrc} style={styles.swapThumbImage} resizeMode="cover" />
                                ) : artHasText ? (
                                  <View style={[styles.swapThumbImage, styles.textArtBg]}>
                                    <Text style={{ color: '#333', fontSize: 6 }} numberOfLines={2}>{artwork.text}</Text>
                                  </View>
                                ) : (
                                  <View style={[styles.swapThumbImage, styles.placeholderArt]}>
                                    <Text style={{ fontSize: 10 }}>🎨</Text>
                                  </View>
                                )}
                              </GoldFrame>
                            </TouchableOpacity>
                          );
                        })}
                        {sortedVaultInspirations.length === 0 && (
                          <Text style={styles.swapEmptyText}>No inspirations yet</Text>
                        )}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  content: {
    padding: 20,
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#5008a7',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#5008a7',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4B0082',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
  },
  tabActive: {
    backgroundColor: 'rgba(184, 200, 232, 0.75)',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: '#5008a7',
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#4B0082',
  },
  tabCount: {
    fontSize: 10,
    color: '#4B0082',
    marginTop: 2,
    fontWeight: 'bold',
  },
  galleryDescription: {
    fontSize: 13,
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },

  // Gallery Section
  gallerySection: {
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    borderWidth: 2,
    borderColor: '#4B0082',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    minHeight: 200,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  galleryItemContainer: {
    width: '48%',
    marginBottom: 15,
  },
  // Curated gallery: 5-per-row compact thumbnails
  curatedThumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  curatedThumbItem: {
    width: '18%',
    aspectRatio: 1,
  },
  curatedThumbImage: {
    width: '100%',
    aspectRatio: 1,
  },
  curatedThumbHint: {
    color: '#4B0082',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  galleryImageBg: {
    alignSelf: 'stretch',
    aspectRatio: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  placeholderArt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
  },
  placeholderEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  placeholderLabel: {
    fontSize: 12,
    color: '#4B0082',
  },

  // Text artwork in gallery frame
  textArtBg: {
    backgroundColor: '#fdf6e3',
    padding: 8,
  },
  textArtScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  textArtContent: {
    fontSize: 11,
    color: '#332100',
    lineHeight: 16,
    textAlign: 'center',
  },
  textArtTitle: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },

  // Full view text modal
  fullTextScroll: {
    flex: 1,
    marginTop: 60,
  },
  fullTextContainer: {
    padding: 24,
  },
  fullTextTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 16,
  },
  fullTextContent: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 28,
  },

  // Artwork Actions
  artworkActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  curateBtn: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    alignItems: 'center',
  },
  curateBtnActive: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(184, 200, 232, 0.75)',
  },
  curateBtnText: {
    fontSize: 10,
    color: '#4B0082',
  },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#4A148C',
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  pendingBadgeText: {
    fontSize: 9,
    color: '#4B0082',
    fontWeight: 'bold',
  },
  // Green check / Red X toggle for private gallery
  markToggleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1a3a1a',
    borderWidth: 2,
    borderColor: '#22AA22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markToggleBtnMarked: {
    backgroundColor: '#1a1a1a',
    borderColor: '#CC2222',
  },
  markToggleCheck: {
    fontSize: 14,
    color: '#22CC22',
    fontWeight: 'bold',
  },
  markToggleX: {
    fontSize: 14,
    color: '#FF3333',
    fontWeight: 'bold',
  },
  curatedTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginTop: 6,
  },
  curatedArtist: {
    fontSize: 11,
    color: '#4B0082',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  artworkDate: {
    fontSize: 10,
    color: '#4B0082',
    marginTop: 3,
  },

  // Side-by-side private tab
  columnHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  columnHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    flex: 1,
  },
  scrollArrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 8,
  },
  scrollArrowGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  scrollArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(5, 13, 97, 0.3)',
    borderWidth: 1,
    borderColor: '#4B0082',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArrowBtnCenter: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderColor: '#FFD700',
  },
  scrollArrowText: {
    fontSize: 14,
    color: '#4B0082',
    fontWeight: 'bold',
  },
  scrollArrowTextCenter: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  sideBySideContainer: {
    flexDirection: 'row',
    minHeight: 400,
    maxHeight: 600,
  },
  column: {
    flex: 1,
  },
  columnScroll: {
    flex: 1,
  },
  columnDivider: {
    width: 1,
    backgroundColor: '#FFD700',
    opacity: 0.4,
    marginHorizontal: 4,
  },
  columnItem: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  columnImageBg: {
    alignSelf: 'stretch',
    aspectRatio: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  emptyStateSmall: {
    padding: 20,
    alignItems: 'center',
  },

  // Art Studio link hint
  studioHint: {
    fontSize: 14,
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  studioLink: {
    color: '#B8860B',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    fontStyle: 'normal',
  },

  // Empty State
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#4B0082',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },

  articleCard: {
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B0082',
    marginBottom: 5,
  },
  articleDescription: {
    fontSize: 14,
    color: '#4B0082',
    marginBottom: 8,
  },
  articleLink: {
    fontSize: 14,
    color: '#4B0082',
    fontWeight: '600',
  },

  // Full-screen modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: Math.min(SCREEN_WIDTH, SCREEN_HEIGHT - 180),
  },
  fullViewCandleRow: {
    position: 'absolute',
    bottom: 40,
    right: 20,
  },

  // Newsfeed Styles
  newsfeedCard: {
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    borderWidth: 2,
    borderColor: '#4B0082',
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  newsfeedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  newsfeedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsfeedAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  newsfeedAvatarLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  newsfeedUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B0082',
  },
  newsfeedArtCount: {
    fontSize: 11,
    color: '#4B0082',
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#93a0b9',
    backgroundColor: 'transparent',
  },
  followBtnActive: {
    backgroundColor: '#93a0b9',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4B0082',
  },
  followBtnTextActive: {
    color: '#0a0e27',
  },
  newsfeedAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  newInspirationAlert: {
    color: '#4B0082',
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Curio strip with arrows
  curioStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  curioStripScroll: {
    flex: 1,
  },
  curioArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(75,0,130,0.15)',
    borderWidth: 1,
    borderColor: '#4B0082',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  curioArrowText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B0082',
    marginTop: -2,
  },
  // Thumbnail strip
  thumbStrip: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 10,
    gap: 8,
  },
  thumbWrapper: {
    width: Math.floor((SCREEN_WIDTH - 20 - 16) / 3),
    height: Math.floor((SCREEN_WIDTH - 20 - 16) / 3),
  },
  thumbFrameInner: {
    alignSelf: 'stretch',
  },
  thumbImageBg: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbTextContent: {
    fontSize: 8,
    color: '#332100',
    lineHeight: 11,
    textAlign: 'center',
    padding: 2,
  },
  thumbHint: {
    fontSize: 11,
    color: '#777',
    textAlign: 'center',
    paddingBottom: 10,
    fontStyle: 'italic',
  },
  navArrowDisabled: {
    opacity: 0.2,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 10,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#444',
  },
  dotActive: {
    backgroundColor: '#FFD700',
  },
  // Carousel modal
  carouselContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  carouselPseudonym: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
  },
  carouselArtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  carouselArrow: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  carouselArrowText: {
    fontSize: 44,
    color: '#fff',
    fontWeight: 'bold',
  },
  carouselFrameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImageScroll: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    width: SCREEN_WIDTH - 120,
    height: SCREEN_HEIGHT * 0.5,
  },
  carouselTextScroll: {
    maxHeight: SCREEN_HEIGHT * 0.5,
    width: SCREEN_WIDTH - 120,
  },
  carouselTextContainer: {
    backgroundColor: '#fdf6e3',
    borderRadius: 8,
    padding: 20,
    minHeight: 200,
  },
  carouselTextTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#332100',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  carouselTextContent: {
    fontSize: 16,
    color: '#332100',
    lineHeight: 24,
  },
  carouselPlaceholder: {
    width: SCREEN_WIDTH - 120,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  carouselCounter: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  carouselActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    marginTop: 16,
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  // Completion screen — mirrors curatedThumbGrid layout
  completionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
    textAlign: 'center',
  },
  completionSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  completionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    flex: 1,
    alignContent: 'center',
  },
  completionThumbItem: {
    width: '18%',
    aspectRatio: 1,
  },
  completionThumbImage: {
    width: '100%',
    aspectRatio: 1,
  },
  dotCompletion: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#FFD700',
  },

  // Curate button disabled
  curateBtnDisabled: {
    opacity: 0.5,
    borderColor: '#444',
  },

  // Save count badge (Inspiring Works tab)
  saveCountBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
    marginTop: 6,
  },
  saveCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  saversList: {
    backgroundColor: 'rgba(184, 200, 232, 0.6)',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  saverName: {
    fontSize: 12,
    color: '#4B0082',
    paddingVertical: 2,
  },

  // Day 13 popup
  day13Popup: {
    backgroundColor: '#1a1e47',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    padding: 30,
    marginHorizontal: 30,
    alignItems: 'center',
  },
  day13Emoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  day13Title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
  },
  day13Text: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  day13Button: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 30,
    paddingVertical: 14,
    marginBottom: 12,
  },
  day13ButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  day13DismissBtn: {
    padding: 8,
  },
  day13DismissText: {
    fontSize: 14,
    color: '#999',
  },

  // Clear Non-Candlelit button
  clearNonCandlelitBtn: {
    borderWidth: 1,
    borderColor: '#4B0082',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  clearNonCandlelitText: {
    color: '#4B0082',
    fontSize: 14,
    fontWeight: '600',
  },
  trashMarkedBtnActive: {
    borderColor: '#CC2222',
    backgroundColor: 'rgba(204, 34, 34, 0.1)',
  },

  // Trash section
  trashSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 12,
  },
  trashToggle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  trashToggleText: {
    color: '#4B0082',
    fontSize: 14,
    fontWeight: '600',
  },
  trashHint: {
    color: '#4B0082',
    fontSize: 11,
    marginTop: 2,
  },
  trashGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    justifyContent: 'center',
  },
  trashItem: {
    alignItems: 'center',
    width: 80,
  },
  trashImage: {
    width: 70,
    height: 70,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555',
    opacity: 0.6,
  },
  trashTimer: {
    color: '#4B0082',
    fontSize: 10,
    marginTop: 4,
  },
  trashRestoreBtn: {
    backgroundColor: 'rgba(75,0,130,0.1)',
    borderWidth: 1,
    borderColor: '#4B0082',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  trashRestoreText: {
    color: '#4B0082',
    fontSize: 11,
    fontWeight: '600',
  },

  // Vault thumbnail grid (2 per row)
  vaultThumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 2,
    justifyContent: 'space-between',
  },
  vaultThumbItem: {
    width: '46%',
    paddingTop: 12,
    paddingBottom: 4,
    position: 'relative',
    alignItems: 'center',
  },
  vaultThumbImage: {
    width: '100%',
    aspectRatio: 1,
  },
  vaultMarkBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(26, 58, 26, 0.85)',
    borderWidth: 1.5,
    borderColor: '#22AA22',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  vaultMarkBadgeMarked: {
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    borderColor: '#CC2222',
  },
  vaultCuratedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(75, 0, 130, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },

  // Inspiration grid (wider items, more spacing, nameplates)
  inspirationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 2,
    justifyContent: 'space-between',
  },
  inspirationItem: {
    width: '46%',
    marginBottom: 8,
    position: 'relative',
  },
  inspirationImage: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  inspirationNameplate: {
    backgroundColor: 'rgba(75, 0, 130, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.4)',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  inspirationTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
  },
  inspirationArtist: {
    fontSize: 9,
    color: '#4B0082',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 1,
  },

  // Nameplate (title + artist under each frame — matches curate button shape)
  nameplateRow: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    alignItems: 'center',
  },
  nameplateTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
  },
  nameplateArtist: {
    fontSize: 9,
    color: '#4B0082',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Candle — bottom right (LAW: candles always bottom right)
  thumbCandleBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 2,
  },

  // Bookshelf full-view overlay
  bookshelfOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(240, 230, 220, 0.95)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B8860B',
    padding: 24,
    alignItems: 'center',
  },
  bookshelfOverlayText: {
    fontSize: 18,
    color: '#4B0082',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 26,
    marginBottom: 16,
  },
  bookshelfOverlayBtn: {
    backgroundColor: '#B8860B',
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  bookshelfOverlayBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Tapestry Swap Modal
  swapOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  swapContent: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  swapLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ccc',
    marginBottom: 10,
    textAlign: 'center',
  },
  swapCurrentFrame: {
    width: Math.min(SCREEN_WIDTH * 0.5, 200),
    alignSelf: 'center',
  },
  swapCurrentImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapHint: {
    fontSize: 13,
    color: '#ccc',
    textAlign: 'center',
    marginVertical: 12,
    fontStyle: 'italic',
  },
  swapColumnsRow: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
  },
  swapColumn: {
    flex: 1,
  },
  swapColumnHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 6,
  },
  swapColumnScroll: {
    flex: 1,
  },
  swapThumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 2,
    justifyContent: 'center',
  },
  swapThumbItem: {
    width: '28%',
    aspectRatio: 1,
  },
  swapThumbImage: {
    width: '100%',
    aspectRatio: 1,
  },
  swapEmptyText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
});

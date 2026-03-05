import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import rankingCriteria from '../ranking-criteria.json';
import { useAuth } from '../context/AuthContext';
import {
  getCouragesForDate,
  getUserVotesForDate,
  submitVoteBatch,
} from '../services/firestoreService';
import { getESTDate, getESTYesterday } from '../utils/dateUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Stock artwork images from ARTOWORKS folder for voting
const ARTOWORKS_IMAGES = [
  { id: 'artowork_1', source: require('../Cliparts/ARTOWORKS/10-18.jpg'), title: 'Sunset Reflections', isFiller: true },
  { id: 'artowork_2', source: require('../Cliparts/ARTOWORKS/540119055_10162967375152264_4178779566219057526_n.jpg'), title: 'Morning Light', isFiller: true },
  { id: 'artowork_3', source: require('../Cliparts/ARTOWORKS/555501898_10163095270207264_8889387783471590897_n.jpg'), title: 'Color Study', isFiller: true },
  { id: 'artowork_4', source: require('../Cliparts/ARTOWORKS/555085754_10237876767528314_2990466336443851643_n.jpg'), title: 'Abstract Dreams', isFiller: true },
  { id: 'artowork_5', source: require('../Cliparts/ARTOWORKS/513903252_10162679994762264_6498884796748588977_n.jpg'), title: 'Quiet Moments', isFiller: true },
  { id: 'artowork_6', source: require('../Cliparts/ARTOWORKS/524578717_10171872892030024_3575163892748854717_n.jpg'), title: 'Deep Perspective', isFiller: true },
  { id: 'artowork_7', source: require('../Cliparts/ARTOWORKS/555617493_10237876767448312_7739267849925085879_n.jpg'), title: 'Inner Landscape', isFiller: true },
  { id: 'artowork_8', source: require('../Cliparts/ARTOWORKS/555447442_10237876768088328_2178101301320484529_n.jpg'), title: 'Free Expression', isFiller: true },
  { id: 'artowork_9', source: require('../Cliparts/ARTOWORKS/524793848_10162839591502264_8318629657123426505_n.jpg'), title: 'Bold Strokes', isFiller: true },
  { id: 'artowork_10', source: require('../Cliparts/ARTOWORKS/555583717_10163109406592264_4681170089551922231_n.jpg'), title: 'Creative Vision', isFiller: true },
  { id: 'artowork_11', source: require('../Cliparts/ARTOWORKS/555573460_10237876768008326_7582047112777369094_n.jpg'), title: 'Peaceful Flow', isFiller: true },
  { id: 'artowork_12', source: require('../Cliparts/ARTOWORKS/556489754_10163095269937264_3934142205780901707_n.jpg'), title: 'Nature\'s Pattern', isFiller: true },
];

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
  const { user } = useAuth();
  const [todaysCriterion, setTodaysCriterion] = useState('');
  const [rankings, setRankings] = useState({}); // { courageId: score }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [currentSet, setCurrentSet] = useState([]); // 4 courages to vote on
  const [votedCourageIds, setVotedCourageIds] = useState(new Set());
  const [availableCourages, setAvailableCourages] = useState([]); // all eligible, minus own
  const [fullViewArtwork, setFullViewArtwork] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [savedInspirations, setSavedInspirations] = useState(new Set());
  const soundRef = useRef(null);

  // Load criterion + saved inspirations
  useEffect(() => {
    loadTodaysCriterion();
    loadSavedInspirations();
  }, []);

  // Load courages and votes when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadVotingData();
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

  const loadTodaysCriterion = async () => {
    try {
      const today = getESTDate();
      const savedDate = await AsyncStorage.getItem('criterion_date');
      const savedCriterion = await AsyncStorage.getItem('todays_criterion');
      if (savedDate === today && savedCriterion) {
        setTodaysCriterion(savedCriterion);
      } else {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const criterionIndex = dayOfYear % rankingCriteria.length;
        const newCriterion = rankingCriteria[criterionIndex];
        setTodaysCriterion(newCriterion);
        await AsyncStorage.setItem('criterion_date', today);
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

  // Candle save — adds/removes from inspiration gallery + fills Connect star
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
      } else {
        favorites.push({
          id: courage.id,
          imageUrl: courage.mediaUrl || null,
          title: courage.title || 'Untitled',
          source: 'candle_save',
          date: getESTDate(),
          savedAt: new Date().toISOString(),
        });
        setSavedInspirations(prev => new Set(prev).add(courage.id));
        // Mark Connect star point for today
        const today = getESTDate();
        await AsyncStorage.setItem(`inspiration_saved_${today}`, 'true');
      }
      await AsyncStorage.setItem('favorite_artworks', JSON.stringify(favorites));
    } catch (e) {
      console.log('Error toggling candle:', e);
    }
  };

  // Email share — opens email compose + fills Connect star
  const handleEmailShare = async (courage) => {
    const subject = encodeURIComponent('Something that inspired me');
    const body = encodeURIComponent(
      'This inspired me to send to you!\n\n' +
      (courage.title ? `"${courage.title}"\n\n` : '') +
      '[Add your message here]\n\n— Sent from MAGIC Tracker'
    );
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
    const today = getESTDate();
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

      // Try to fetch real courages
      let courages = [];
      try {
        courages = await getCouragesForDate(votingDate);
      } catch (e) {
        console.log('Could not fetch courages, using stock images:', e);
      }

      // Filter out user's own courage
      const eligible = courages.filter(c => c.uid !== user.uid);

      // Get user's existing votes
      let alreadyVotedIds = new Set();
      try {
        const existingVotes = await getUserVotesForDate(user.uid, votingDate);
        alreadyVotedIds = new Set(existingVotes.map(v => v.courageId));
      } catch (e) {
        console.log('Could not fetch votes:', e);
      }

      // Also check locally-voted stock image IDs for today
      const today = getESTDate();
      try {
        const localVoted = await AsyncStorage.getItem(`stock_voted_${today}`);
        if (localVoted) {
          JSON.parse(localVoted).forEach(id => alreadyVotedIds.add(id));
        }
      } catch (e) {}

      setAvailableCourages(eligible);
      setVotedCourageIds(alreadyVotedIds);

      if (eligible.length >= 4) {
        // Enough real courages — use them
        const unvoted = eligible.filter(c => !alreadyVotedIds.has(c.id));
        if (unvoted.length === 0) {
          setAllDone(true);
          setCurrentSet([]);
        } else if (unvoted.length >= 4) {
          const shuffled = [...unvoted].sort(() => Math.random() - 0.5);
          setCurrentSet(shuffled.slice(0, 4));
          setAllDone(false);
        } else {
          // Mix real courages + stock to reach 4
          const stockFill = pickStockSet(new Set([...alreadyVotedIds, ...unvoted.map(c => c.id)]));
          const mixed = [...unvoted, ...stockFill].slice(0, 4);
          if (mixed.length >= 4) {
            setCurrentSet(mixed);
            setAllDone(false);
          } else {
            setAllDone(true);
            setCurrentSet([]);
          }
        }
      } else {
        // Not enough real courages — use stock images
        const stockSet = pickStockSet(alreadyVotedIds);
        if (stockSet.length >= 4) {
          setCurrentSet(stockSet);
          setAllDone(false);
        } else {
          // All stock images voted on today
          setAllDone(true);
          setCurrentSet([]);
        }
      }
    } catch (error) {
      console.log('Error loading voting data:', error);
      // Fallback: show stock images even if everything fails
      const stockSet = pickStockSet(new Set());
      if (stockSet.length >= 4) {
        setCurrentSet(stockSet);
        setAllDone(false);
      }
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

    if (Object.keys(batchRankings).length < 4) {
      Alert.alert('Incomplete', 'Please rank all artworks before submitting.');
      return;
    }

    // Check for duplicate ranks
    const usedRanks = Object.values(batchRankings);
    if (new Set(usedRanks).size !== usedRanks.length) {
      Alert.alert('Duplicate Ranks', 'Each artwork must have a unique rank. Please adjust before submitting.');
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
        }
      }

      // Save stock image votes locally so they don't repeat today
      if (stockIds.length > 0) {
        try {
          const existing = await AsyncStorage.getItem(`stock_voted_${today}`);
          const prev = existing ? JSON.parse(existing) : [];
          const merged = [...new Set([...prev, ...stockIds])];
          await AsyncStorage.setItem(`stock_voted_${today}`, JSON.stringify(merged));
        } catch (e) {}
      }

      // Mark ranked for today (for MAGIC star)
      await AsyncStorage.setItem(`ranked_${today}`, 'true');

      // Update voted IDs
      const newVotedIds = new Set(votedCourageIds);
      currentIds.forEach(id => newVotedIds.add(id));
      setVotedCourageIds(newVotedIds);

      // Reset rankings
      setRankings({});

      // Show thank you popup
      Alert.alert('Thank You for Voting!', 'Your votes have been submitted.');

      // Load next set — check stock images available
      const nextStock = pickStockSet(newVotedIds);
      const unvotedReal = availableCourages.filter(c => !newVotedIds.has(c.id));

      if (unvotedReal.length >= 4) {
        const shuffled = [...unvotedReal].sort(() => Math.random() - 0.5);
        setCurrentSet(shuffled.slice(0, 4));
      } else if (nextStock.length >= 4) {
        // More stock images to vote on
        setCurrentSet(nextStock);
      } else {
        setAllDone(true);
        setCurrentSet([]);
      }
    } catch (error) {
      console.log('Error submitting votes:', error);
      Alert.alert('Error', 'Could not submit votes. Please try again.');
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
      Alert.alert('Error', 'Could not play audio.');
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

          {/* Image or Audio Player */}
          <TouchableOpacity
            style={styles.imageFrame}
            onPress={() => {
              if (isAudio) {
                playAudio(courage);
              } else if (courage.mediaUrl || courage.source) {
                setFullViewArtwork(courage);
              }
            }}
          >
            {courage.source ? (
              <Image
                source={courage.source}
                style={styles.artworkImage}
                resizeMode="cover"
              />
            ) : isAudio ? (
              <View style={styles.audioFrame}>
                <Text style={styles.audioIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
                <Text style={styles.audioLabel}>{isPlaying ? 'Playing...' : 'Tap to Play'}</Text>
              </View>
            ) : courage.mediaUrl ? (
              <Image
                source={{ uri: courage.mediaUrl }}
                style={styles.artworkImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.textCourageFrame}>
                <Text style={styles.textCourageContent} numberOfLines={6}>
                  {courage.title}
                </Text>
              </View>
            )}
            {currentRank && (
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#{currentRank}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Candle on the right */}
          <View style={styles.sideAction}>
            <Candle
              lit={isSaved}
              onPress={() => handleCandleSave(courage)}
              size={32}
            />
          </View>
        </View>

        {/* Title only — anonymous, no artist name */}
        <View style={styles.artistInfo}>
          <Text style={styles.artworkTitle} numberOfLines={2}>
            {courage.title || 'Untitled'}
          </Text>
        </View>

        {/* Ranking Buttons */}
        <View style={styles.rankingContainer}>
          <View style={styles.rankingButtons}>
            {[1, 2, 3, 4].map((score) => {
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
        <Text style={styles.thankYouText}>Thank you{'\n'}for voting!</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
        <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#004225" />
          <Text style={[styles.subtitle, { marginTop: 15 }]}>Loading courages...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      {/* Full-page image viewer modal */}
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
          {fullViewArtwork && (
            <View style={styles.modalContent}>
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
              <Text style={styles.modalTitle}>{fullViewArtwork.title}</Text>
              <Text style={styles.modalHint}>Pinch to zoom, drag to pan</Text>
            </View>
          )}
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Inspire</Text>
        <Text style={styles.subtitle}>Vote on Community Courage</Text>

        {/* Today's Ranking Criterion */}
        <View style={styles.criterionCard}>
          <Text style={styles.criterionLabel}>Today's Ranking Criterion:</Text>
          <Text style={styles.criterionText}>{todaysCriterion}</Text>
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
              <Text style={styles.completeText}>
                {availableCourages.length === 0
                  ? 'No courages available for voting yet!'
                  : 'You have voted on all available courages!'}
              </Text>
              <Text style={styles.completeSubtext}>
                {availableCourages.length === 0
                  ? 'Check back after others have uploaded their daily courage.'
                  : 'Come back tomorrow for new submissions!'}
              </Text>
            </View>
          </>
        )}

        {/* Voting Mode */}
        {!allDone && currentSet.length === 4 && (
          <>
            {/* Progress */}
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Ranked {rankedCount} of 4 artworks
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>

            <Text style={styles.instructionText}>
              Rank 1-4 (1=best). Each rank used once. Title only — anonymous voting.
            </Text>

            {/* Artworks Grid */}
            <View style={styles.artworksGrid}>
              {currentSet.map(courage => renderCourageCard(courage))}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (submitting || rankedCount < 4) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || rankedCount < 4}
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
    color: '#004225',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#004225',
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
    color: '#004225',
    marginBottom: 10,
  },
  criterionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#004225',
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
    flex: 1,
    backgroundColor: '#1a2a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
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
    maxHeight: SCREEN_WIDTH,
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
    height: SCREEN_WIDTH - 6,
    borderRadius: 5,
  },
  modalTitle: {
    fontSize: 18,
    color: '#cfe8c7',
    fontStyle: 'italic',
    marginTop: 15,
  },
  modalHint: {
    fontSize: 12,
    color: '#555',
    marginTop: 10,
  },
});

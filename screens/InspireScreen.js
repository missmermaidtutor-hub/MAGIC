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
import { getESTDate, getESTYesterday, getESTDayBeforeYesterday } from '../utils/dateUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const [fillerIds, setFillerIds] = useState(new Set()); // IDs from previous day (not eligible for winner)
  const [fullViewArtwork, setFullViewArtwork] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const soundRef = useRef(null);

  // Load criterion
  useEffect(() => {
    loadTodaysCriterion();
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

  const loadVotingData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Voting date = yesterday EST (courages uploaded yesterday are today's voting pool)
      const votingDate = getESTYesterday();
      const prevDate = getESTDayBeforeYesterday();

      // Fetch all courages for the voting date
      const courages = await getCouragesForDate(votingDate);

      // Filter out user's own courage
      const eligible = courages.filter(c => c.uid !== user.uid);

      // Get user's existing votes for this voting date
      const existingVotes = await getUserVotesForDate(user.uid, votingDate);
      const alreadyVotedIds = new Set(existingVotes.map(v => v.courageId));

      setAvailableCourages(eligible);
      setVotedCourageIds(alreadyVotedIds);

      // Check if all eligible courages have been voted on
      const unvoted = eligible.filter(c => !alreadyVotedIds.has(c.id));

      if (unvoted.length === 0 && eligible.length > 0) {
        // All voted on
        setAllDone(true);
        setCurrentSet([]);
      } else if (unvoted.length >= 4) {
        // Pick 4 random unvoted courages
        const shuffled = [...unvoted].sort(() => Math.random() - 0.5);
        setCurrentSet(shuffled.slice(0, 4));
        setAllDone(false);
      } else if (unvoted.length > 0 && unvoted.length < 4) {
        // Need fillers from previous day
        const prevCourages = await getCouragesForDate(prevDate);
        const prevEligible = prevCourages.filter(c => c.uid !== user.uid);
        const shuffledPrev = [...prevEligible].sort(() => Math.random() - 0.5);
        const fillersNeeded = 4 - unvoted.length;
        const fillers = shuffledPrev.slice(0, Math.min(fillersNeeded, 3));
        const newFillerIds = new Set(fillers.map(f => f.id));
        setFillerIds(newFillerIds);

        if (unvoted.length + fillers.length >= 4) {
          setCurrentSet([...unvoted, ...fillers].slice(0, 4));
          setAllDone(false);
        } else {
          // Can't make a set of 4
          setAllDone(true);
          setCurrentSet([]);
        }
      } else {
        // No courages available at all
        setCurrentSet([]);
        setAllDone(eligible.length > 0);
      }
    } catch (error) {
      console.log('Error loading voting data:', error);
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

      // Build vote objects
      const votes = currentIds.map(id => ({
        courageId: id,
        courageDate: votingDate,
        score: batchRankings[id],
      }));

      // Submit to Firestore
      await submitVoteBatch(user.uid, votes);

      // Mark ranked for today (for MAGIC star)
      await AsyncStorage.setItem(`ranked_${today}`, 'true');

      // Update voted IDs
      const newVotedIds = new Set(votedCourageIds);
      currentIds.forEach(id => newVotedIds.add(id));
      setVotedCourageIds(newVotedIds);

      // Reset rankings and auto-load next set
      setRankings({});

      // Find next set of unvoted courages
      const unvoted = availableCourages.filter(c => !newVotedIds.has(c.id));

      if (unvoted.length === 0) {
        setAllDone(true);
        setCurrentSet([]);
      } else if (unvoted.length >= 4) {
        const shuffled = [...unvoted].sort(() => Math.random() - 0.5);
        setCurrentSet(shuffled.slice(0, 4));
      } else {
        // Need fillers from previous day
        const prevDate = getESTDayBeforeYesterday();
        const prevCourages = await getCouragesForDate(prevDate);
        const prevEligible = prevCourages.filter(c => c.uid !== user.uid);
        const shuffledPrev = [...prevEligible].sort(() => Math.random() - 0.5);
        const fillersNeeded = 4 - unvoted.length;
        const fillers = shuffledPrev.slice(0, Math.min(fillersNeeded, 3));
        const newFillerIds = new Set(fillers.map(f => f.id));
        setFillerIds(newFillerIds);

        if (unvoted.length + fillers.length >= 4) {
          setCurrentSet([...unvoted, ...fillers].slice(0, 4));
        } else {
          setAllDone(true);
          setCurrentSet([]);
        }
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

    return (
      <View key={courage.id} style={styles.artworkCard}>
        {/* Image or Audio Player */}
        <TouchableOpacity
          style={styles.imageFrame}
          onPress={() => {
            if (isAudio) {
              playAudio(courage);
            } else if (courage.mediaUrl) {
              setFullViewArtwork(courage);
            }
          }}
        >
          {isAudio ? (
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
                  source={{ uri: fullViewArtwork.mediaUrl }}
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
    padding: 10,
    marginBottom: 15,
  },
  imageFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
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

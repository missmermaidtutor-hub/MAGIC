import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Modal,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rankingCriteria from '../ranking-criteria.json';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function InspireScreen() {
  const [todaysCriterion, setTodaysCriterion] = useState('');
  const [rankings, setRankings] = useState({});
  const [favorites, setFavorites] = useState(new Set());
  const [hasRankedToday, setHasRankedToday] = useState(false);
  const [allArtworks, setAllArtworks] = useState([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [batchesCompleted, setBatchesCompleted] = useState(0);
  const [fullViewArtwork, setFullViewArtwork] = useState(null);

  const MAX_VOTING_BATCHES = 2;

  useEffect(() => {
    loadArtworks();
  }, []);

  const loadArtworks = async () => {
    try {
      const publicData = await AsyncStorage.getItem('public_artworks');
      if (publicData) {
        const artworks = JSON.parse(publicData);
        const shuffled = artworks.sort(() => Math.random() - 0.5);
        setAllArtworks(shuffled);
      } else {
        setAllArtworks(getSampleArtworks());
      }
    } catch (error) {
      console.log('Error loading artworks:', error);
      setAllArtworks(getSampleArtworks());
    }
  };

  const getSampleArtworks = () => {
    return [
      { id: 1, imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop', artist: 'Artist A', title: 'Abstract Thoughts', prompt: 'Sample artwork' },
      { id: 2, imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop', artist: 'Artist B', title: 'Color Study', prompt: 'Sample artwork' },
      { id: 3, imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop', artist: 'Artist C', title: 'Geometric Form', prompt: 'Sample artwork' },
      { id: 4, imageUrl: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&h=400&fit=crop', artist: 'Artist D', title: 'Expression', prompt: 'Sample artwork' },
      { id: 5, imageUrl: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=400&h=400&fit=crop', artist: 'Artist E', title: 'Movement', prompt: 'Sample artwork' },
      { id: 6, imageUrl: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop', artist: 'Artist F', title: 'Flow', prompt: 'Sample artwork' },
      { id: 7, imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop', artist: 'Artist G', title: 'Energy', prompt: 'Sample artwork' },
      { id: 8, imageUrl: 'https://images.unsplash.com/photo-1545551816-c691d80f8e31?w=400&h=400&fit=crop', artist: 'Artist H', title: 'Harmony', prompt: 'Sample artwork' },
    ];
  };

  const currentArtworks = allArtworks.slice(currentBatch * 4, (currentBatch * 4) + 4);
  const hasMore = (currentBatch * 4) + 4 < allArtworks.length;
  const inFreeScrollMode = batchesCompleted >= MAX_VOTING_BATCHES;
  const remainingArtworks = allArtworks; // show all artworks for free browsing after voting

  useEffect(() => {
    loadTodaysCriterion();
    loadRankings();
    loadFavorites();
    checkIfRankedToday();
  }, []);

  const loadTodaysCriterion = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
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

  const loadRankings = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const saved = await AsyncStorage.getItem(`rankings_${today}`);
      if (saved) setRankings(JSON.parse(saved));
    } catch (error) {
      console.log('Error loading rankings:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('favorite_artworks');
      if (saved) setFavorites(new Set(JSON.parse(saved)));
    } catch (error) {
      console.log('Error loading favorites:', error);
    }
  };

  const checkIfRankedToday = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const ranked = await AsyncStorage.getItem(`ranked_${today}`);
      setHasRankedToday(ranked === 'true');
    } catch (error) {
      console.log('Error checking ranked status:', error);
    }
  };

  const saveRankings = async (newRankings) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(`rankings_${today}`, JSON.stringify(newRankings));
      setRankings(newRankings);
    } catch (error) {
      console.log('Error saving rankings:', error);
    }
  };

  const saveFavorites = async (newFavorites) => {
    try {
      await AsyncStorage.setItem('favorite_artworks', JSON.stringify([...newFavorites]));
      setFavorites(newFavorites);
    } catch (error) {
      console.log('Error saving favorites:', error);
    }
  };

  const handleRank = (artworkId, score) => {
    if (isSubmitted) return;
    const scoreAlreadyUsed = Object.entries(rankings).some(
      ([id, rank]) => rank === score && parseInt(id) !== artworkId
    );
    if (scoreAlreadyUsed) {
      Alert.alert('Already Used', `Rank ${score} is already assigned. Each artwork must have a unique rank.`);
      return;
    }
    const newRankings = { ...rankings, [artworkId]: score };
    saveRankings(newRankings);
  };

  const handleSubmit = async () => {
    if (Object.keys(rankings).length < currentArtworks.length) {
      Alert.alert('Incomplete', 'Please rank all artworks before submitting.');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const allRankings = await AsyncStorage.getItem('all_rankings');
      const rankingsData = allRankings ? JSON.parse(allRankings) : {};
      if (!rankingsData[today]) rankingsData[today] = [];
      rankingsData[today].push({
        batch: currentBatch,
        rankings: rankings,
        criterion: todaysCriterion,
        timestamp: new Date().toISOString()
      });
      await AsyncStorage.setItem('all_rankings', JSON.stringify(rankingsData));
      setIsSubmitted(true);
      const newBatchesCompleted = batchesCompleted + 1;
      setBatchesCompleted(newBatchesCompleted);

      if (newBatchesCompleted >= MAX_VOTING_BATCHES) {
        await AsyncStorage.setItem(`ranked_${today}`, 'true');
        setHasRankedToday(true);
        Alert.alert('Rankings Complete!', 'You can now freely browse remaining Courage posts.');
      } else {
        Alert.alert('Submitted!', 'Your rankings have been recorded! Tap "Next Batch" to rank more.');
      }
    } catch (error) {
      console.log('Error submitting rankings:', error);
    }
  };

  const loadNextBatch = () => {
    setCurrentBatch(prev => prev + 1);
    setRankings({});
    setIsSubmitted(false);
  };

  const toggleFavorite = (artworkId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(artworkId)) {
      newFavorites.delete(artworkId);
    } else {
      newFavorites.add(artworkId);
    }
    saveFavorites(newFavorites);
  };

  const shareArtwork = async (artwork) => {
    try {
      await Share.share({
        message: `Check out this amazing artwork: "${artwork.title}" by ${artwork.artist}`,
        title: artwork.title
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share artwork');
    }
  };

  const rankedCount = Object.keys(rankings).length;
  const progressPercent = currentArtworks.length > 0 ? (rankedCount / currentArtworks.length) * 100 : 0;
  const canSubmit = rankedCount === currentArtworks.length && !isSubmitted && currentArtworks.length > 0;

  const isRankAvailable = (rank, artworkId) => {
    return !Object.entries(rankings).some(
      ([id, assignedRank]) => assignedRank === rank && parseInt(id) !== artworkId
    );
  };

  // Render a single artwork card (used in both voting and free scroll modes)
  const renderArtworkCard = (artwork, votingEnabled, index) => {
    const currentRank = rankings[artwork.id];
    const isFavorited = favorites.has(artwork.id);
    const canTapToView = index < 4 || !votingEnabled;

    return (
      <View key={artwork.id} style={[
        styles.artworkCard,
        isSubmitted && votingEnabled && styles.artworkCardSubmitted
      ]}>
        {/* Image — tappable for full view */}
        <TouchableOpacity
          style={styles.imageFrame}
          onPress={() => canTapToView ? setFullViewArtwork(artwork) : null}
          activeOpacity={canTapToView ? 0.7 : 1}
        >
          <Image
            source={{ uri: artwork.imageUrl }}
            style={styles.artworkImage}
            resizeMode="cover"
          />
          {currentRank && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>#{currentRank}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Artist Info */}
        <View style={styles.artistInfo}>
          <Text style={styles.artistName}>{artwork.artist}</Text>
          <Text style={styles.artworkTitle}>{artwork.title}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButtonSmall, isFavorited && styles.actionButtonActive]}
            onPress={() => toggleFavorite(artwork.id)}
          >
            <Text style={styles.actionIconSmall}>{isFavorited ? '💜' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSmall} onPress={() => shareArtwork(artwork)}>
            <Text style={styles.actionIconSmall}>📤</Text>
          </TouchableOpacity>
        </View>

        {/* Ranking Buttons — only in voting mode */}
        {votingEnabled && (
          <View style={styles.rankingContainer}>
            <View style={styles.rankingButtons}>
              {[1, 2, 3, 4].map((score) => {
                const available = isRankAvailable(score, artwork.id);
                const isSelected = currentRank === score;
                return (
                  <TouchableOpacity
                    key={score}
                    style={[
                      styles.rankButton,
                      isSelected && styles.rankButtonSelected,
                      !available && !isSelected && styles.rankButtonDisabled,
                      isSubmitted && styles.rankButtonDisabled
                    ]}
                    onPress={() => handleRank(artwork.id, score)}
                    disabled={(!available && !isSelected) || isSubmitted}
                  >
                    <Text style={[
                      styles.rankButtonText,
                      isSelected && styles.rankButtonTextSelected,
                      !available && !isSelected && styles.rankButtonTextDisabled
                    ]}>
                      {score}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (allArtworks.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.header}>Inspire</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No artworks to rank yet!</Text>
            <Text style={styles.emptySubtext}>
              Go to Art Studio and upload some COURAGE posts to see them here!
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
                  source={{ uri: fullViewArtwork.imageUrl }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </ScrollView>
              <Text style={styles.modalArtist}>{fullViewArtwork.artist}</Text>
              <Text style={styles.modalTitle}>{fullViewArtwork.title}</Text>
              <Text style={styles.modalHint}>Pinch to zoom, drag to pan</Text>
            </View>
          )}
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Inspire</Text>
        <Text style={styles.subtitle}>View & Rank Community Art</Text>

        {/* Today's Ranking Criterion */}
        <View style={styles.criterionCard}>
          <Text style={styles.criterionLabel}>Today's Ranking Criterion:</Text>
          <Text style={styles.criterionText}>{todaysCriterion}</Text>
        </View>

        {/* Voting Mode — batches 1 and 2 */}
        {!inFreeScrollMode && (
          <>
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Ranked {rankedCount} of {currentArtworks.length} artworks (Set {currentBatch + 1} of {MAX_VOTING_BATCHES})
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>

            <Text style={styles.instructionText}>
              {isSubmitted
                ? 'Submitted! Tap "Next Batch" for more.'
                : 'Tap artwork for full view. Rank 1-4 (1=best). Each rank used once.'}
            </Text>

            {/* Artworks Grid */}
            <View style={styles.artworksGrid}>
              {currentArtworks.map((artwork, index) => renderArtworkCard(artwork, true, index))}
            </View>

            {/* Submit Button */}
            {!isSubmitted && (
              <TouchableOpacity
                style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={styles.submitButtonText}>
                  {canSubmit ? 'Submit Rankings' : `Rank All ${currentArtworks.length} to Submit`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Next Batch Button */}
            {isSubmitted && batchesCompleted < MAX_VOTING_BATCHES && hasMore && (
              <TouchableOpacity style={styles.nextButton} onPress={loadNextBatch}>
                <Text style={styles.nextButtonText}>Next Batch →</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Free Scroll Mode — after 2 voting sets */}
        {inFreeScrollMode && (
          <>
            <View style={styles.freeScrollBanner}>
              <Text style={styles.freeScrollText}>Voting complete! Browse remaining Courage posts freely.</Text>
            </View>

            {remainingArtworks.length > 0 ? (
              <View style={styles.artworksGrid}>
                {remainingArtworks.map((artwork, index) => renderArtworkCard(artwork, false, index))}
              </View>
            ) : (
              <View style={styles.completeCard}>
                <Text style={styles.completeText}>You've seen all available artworks!</Text>
                <Text style={styles.completeSubtext}>Come back tomorrow for new submissions!</Text>
              </View>
            )}
          </>
        )}

        {/* View Galleries Button */}
        <TouchableOpacity style={styles.galleryButton}>
          <Text style={styles.galleryButtonText}>
            View My Inspiration Gallery ({favorites.size} saved)
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#87CEEB',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  criterionCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#87CEEB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  criterionLabel: {
    fontSize: 16,
    color: '#87CEEB',
    marginBottom: 10,
  },
  criterionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#87CEEB',
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#87CEEB',
  },
  instructionText: {
    fontSize: 14,
    color: '#87CEEB',
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
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 10,
    marginBottom: 15,
  },
  artworkCardSubmitted: {
    opacity: 0.7,
  },
  imageFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#87CEEB',
    position: 'relative',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  rankBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FFD700',
    borderRadius: 20,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  rankBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  artistInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  artworkTitle: {
    fontSize: 10,
    color: '#87CEEB',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  actionButtonSmall: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    minWidth: 50,
  },
  actionButtonActive: {
    borderColor: '#9C27B0',
    backgroundColor: '#4A148C',
  },
  actionIconSmall: {
    fontSize: 20,
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
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankButtonSelected: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  rankButtonDisabled: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
    opacity: 0.4,
  },
  rankButtonText: {
    fontSize: 16,
    color: '#87CEEB',
    fontWeight: 'bold',
  },
  rankButtonTextSelected: {
    color: '#000',
  },
  rankButtonTextDisabled: {
    color: '#555',
  },
  submitButton: {
    backgroundColor: '#FFD700',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#2a2a2a',
    borderColor: '#666',
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 20,
    color: '#000',
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#4A148C',
    borderWidth: 3,
    borderColor: '#9C27B0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  nextButtonText: {
    fontSize: 18,
    color: '#DDA0DD',
    fontWeight: 'bold',
  },
  freeScrollBanner: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#87CEEB',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  freeScrollText: {
    fontSize: 16,
    color: '#87CEEB',
    textAlign: 'center',
    fontWeight: '600',
  },
  completeCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  completeText: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  completeSubtext: {
    fontSize: 14,
    color: '#87CEEB',
    textAlign: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#87CEEB',
    textAlign: 'center',
    lineHeight: 24,
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
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#FFD700',
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
    borderColor: '#FFD700',
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
  modalArtist: {
    fontSize: 22,
    color: '#FFD700',
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  modalTitle: {
    fontSize: 18,
    color: '#87CEEB',
    fontStyle: 'italic',
  },
  modalHint: {
    fontSize: 12,
    color: '#555',
    marginTop: 10,
  },
});

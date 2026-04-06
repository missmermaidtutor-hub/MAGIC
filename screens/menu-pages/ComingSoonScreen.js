import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ImageBackground, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/alertUtils';
import ThemedBackground from '../../components/ThemedBackground';
import {
  voteForFeature,
  removeFeatureVote,
  getFeatureVoteCounts,
  getUserFeatureVotes,
  submitFeatureIdea,
} from '../../services/firestoreService';

const BOUTIQUE_ITEMS = [
  { emoji: '\uD83D\uDDBC\uFE0F', label: 'Prints' },
  { emoji: '\u2615', label: 'Mugs' },
  { emoji: '\uD83D\uDC55', label: 'Apparel' },
  { emoji: '\uD83D\uDCF1', label: 'Cases' },
];

const PREMIUM_FEATURES = [
  'Advanced per-MAGIC-category statistics',
  'Inspiration impact tracking',
  'Past diary & journal entries',
  'Favorite quote archive',
  'Expanded curated gallery (25 slots)',
  'Full goal history & stats',
  'Early curated gallery access',
  'Full color controls in Art Studio',
  'Advanced text styling in Art Studio',
  'Unlimited pseudonym changes',
  'Gallery organizing (folders, tags, sorting)',
  'Streak Pause (up to 3 days/month)',
  'Streak Saver (auto-save missed days)',
];

const COMING_SOON_FEATURES = [
  {
    key: 'boutique',
    emoji: '\uD83D\uDECD\uFE0F',
    label: 'Boutique',
    expandable: true,
  },
  {
    key: 'premium',
    emoji: '\uD83D\uDC51',
    label: 'Premium Membership',
    popup: {
      title: 'Premium Membership',
      body: PREMIUM_FEATURES,
      type: 'list',
    },
  },
  {
    key: 'challenges',
    emoji: '\uD83C\uDFA8',
    label: 'Art Challenges',
    popup: {
      title: 'Art Challenges',
      body: 'Competitions where artists can enter for prizes! Some challenges may have an entry fee. Winners receive recognition and rewards from the MAGIC community.',
      type: 'text',
    },
  },
  {
    key: 'classes',
    emoji: '\uD83C\uDF1F',
    label: 'Classes',
    popup: {
      title: 'Classes',
      body: 'Creative classes led by experienced artists and mentors. Initially, classes will be held via Zoom so you can learn and create together in real time from anywhere.',
      type: 'text',
    },
  },
  {
    key: 'discussionPods',
    emoji: '\uD83D\uDCAC',
    label: 'Discussion Pods',
    popup: {
      title: 'Discussion Pods',
      body: 'Small group conversations with other MAGIC artists! Pods will be assigned based on your interests and creative mediums. You can opt in or out of pods anytime on your About You page.',
      type: 'text',
    },
  },
];

export default function ComingSoonScreen({ route, navigation }) {
  const { user, userProfile } = useAuth();
  const [voteCounts, setVoteCounts] = useState({});
  const [userVotes, setUserVotes] = useState(new Set());
  const [ideaText, setIdeaText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boutiqueExpanded, setBoutiqueExpanded] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState(null);

  useEffect(() => {
    loadVoteData();
  }, []);

  const loadVoteData = async () => {
    try {
      const [counts, votes] = await Promise.all([
        getFeatureVoteCounts(),
        user ? getUserFeatureVotes(user.uid) : new Set(),
      ]);
      setVoteCounts(counts);
      setUserVotes(votes);
    } catch (e) {
      console.log('Error loading vote data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (featureKey) => {
    if (!user) return;

    if (userVotes.has(featureKey)) {
      // Un-vote: optimistic update
      setUserVotes(prev => {
        const next = new Set(prev);
        next.delete(featureKey);
        return next;
      });
      setVoteCounts(prev => ({ ...prev, [featureKey]: Math.max(0, (prev[featureKey] || 1) - 1) }));

      try {
        await removeFeatureVote(featureKey, user.uid);
      } catch (e) {
        // Revert on error
        setUserVotes(prev => new Set([...prev, featureKey]));
        setVoteCounts(prev => ({ ...prev, [featureKey]: (prev[featureKey] || 0) + 1 }));
      }
      return;
    }

    // Vote: optimistic update
    setUserVotes(prev => new Set([...prev, featureKey]));
    setVoteCounts(prev => ({ ...prev, [featureKey]: (prev[featureKey] || 0) + 1 }));

    const success = await voteForFeature(featureKey, user.uid);
    if (!success) {
      // Revert if already voted (race condition)
      setUserVotes(prev => {
        const next = new Set(prev);
        next.delete(featureKey);
        return next;
      });
      setVoteCounts(prev => ({ ...prev, [featureKey]: Math.max(0, (prev[featureKey] || 1) - 1) }));
    }
  };

  const handleFeaturePress = (feature) => {
    if (feature.expandable) {
      setBoutiqueExpanded(!boutiqueExpanded);
    } else if (feature.popup) {
      setPopupData(feature.popup);
      setPopupVisible(true);
    }
  };

  const handleSubmitIdea = async () => {
    const trimmed = ideaText.trim();
    if (!trimmed) {
      showAlert('Empty Idea', 'Please write your idea before submitting.');
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      await submitFeatureIdea(trimmed, user.uid, userProfile?.pseudonym);
      setIdeaText('');
      showAlert('Thank You!', 'Your idea has been submitted. We love hearing from our community!');
    } catch (e) {
      console.log('Error submitting idea:', e);
      showAlert('Error', 'Could not submit your idea. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedBackground style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.closeBtnText}>{'\u2715'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>{'\u2630'}</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Coming Soon</Text>

        {/* Most Excited About */}
        <Text style={styles.sectionTitle}>Most Excited About</Text>
        <Text style={styles.sectionSubtitle}>Tap to vote for the features you want most!</Text>

        {loading ? (
          <ActivityIndicator color="#FFD700" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.voteList}>
            {COMING_SOON_FEATURES.map((feature) => {
              const hasVoted = userVotes.has(feature.key);
              const count = voteCounts[feature.key] || 0;
              return (
                <View key={feature.key}>
                  <View style={styles.featureRow}>
                    {/* Vote button (left side) */}
                    <TouchableOpacity
                      style={[styles.voteButton, hasVoted && styles.voteButtonVoted]}
                      onPress={() => handleVote(feature.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.voteBadgeText}>{count}</Text>
                      {hasVoted && <Text style={styles.voteCheck}>{'\u2713'}</Text>}
                    </TouchableOpacity>

                    {/* Feature label (tappable for popup/expand) */}
                    <TouchableOpacity
                      style={styles.featureLabelArea}
                      onPress={() => handleFeaturePress(feature)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.voteEmoji}>{feature.emoji}</Text>
                      <Text style={styles.voteLabel}>{feature.label}</Text>
                      {feature.expandable && (
                        <Text style={styles.expandArrow}>{boutiqueExpanded ? '\u25B2' : '\u25BC'}</Text>
                      )}
                      {feature.popup && (
                        <Text style={styles.infoIcon}>i</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Boutique expansion */}
                  {feature.expandable && boutiqueExpanded && (
                    <View style={styles.boutiqueExpansion}>
                      <Text style={styles.boutiqueSubtitle}>Turn your art into physical products</Text>
                      <View style={styles.boutiqueItems}>
                        {BOUTIQUE_ITEMS.map((item) => (
                          <View key={item.label} style={styles.boutiqueItem}>
                            <Text style={styles.boutiqueEmoji}>{item.emoji}</Text>
                            <Text style={styles.boutiqueLabel}>{item.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Share Your Ideas */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Share Your Ideas</Text>
        <Text style={styles.sectionSubtitle}>What features would make MAGIC even better?</Text>

        <TextInput
          style={styles.ideaInput}
          placeholder="Describe your idea..."
          placeholderTextColor="#888"
          value={ideaText}
          onChangeText={setIdeaText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.6 }]}
          onPress={handleSubmitIdea}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Idea'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Feature Info Popup */}
      <Modal
        visible={popupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{popupData?.title}</Text>

            {popupData?.type === 'list' ? (
              <ScrollView style={styles.modalScroll}>
                {popupData.body.map((item, i) => (
                  <View key={i} style={styles.modalListItem}>
                    <Text style={styles.modalBullet}>{'\u2605'}</Text>
                    <Text style={styles.modalListText}>{item}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.modalBody}>{popupData?.body}</Text>
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setPopupVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginTop: 55,
    marginBottom: 24,
  },

  // Voting section
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 16,
  },
  voteList: {
    width: '100%',
    maxWidth: 400,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(75, 0, 130, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minWidth: 56,
    gap: 4,
  },
  voteButtonVoted: {
    borderColor: '#4B0082',
    backgroundColor: 'rgba(75, 0, 130, 0.15)',
  },
  featureLabelArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(75, 0, 130, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginLeft: 8,
  },
  voteEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  voteLabel: {
    flex: 1,
    fontSize: 16,
    color: '#4B0082',
    fontWeight: '600',
  },
  voteBadgeText: {
    color: '#4B0082',
    fontSize: 15,
    fontWeight: '700',
  },
  voteCheck: {
    color: '#4B0082',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expandArrow: {
    color: '#4B0082',
    fontSize: 12,
    marginLeft: 4,
  },
  infoIcon: {
    color: '#4B0082',
    fontSize: 14,
    fontWeight: 'bold',
    fontStyle: 'italic',
    backgroundColor: 'rgba(75, 0, 130, 0.12)',
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
    marginLeft: 4,
  },

  // Boutique expansion
  boutiqueExpansion: {
    backgroundColor: 'rgba(75, 0, 130, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    marginLeft: 64,
    alignItems: 'center',
  },
  boutiqueSubtitle: {
    fontSize: 13,
    color: '#4B0082',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  boutiqueItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  boutiqueItem: {
    alignItems: 'center',
  },
  boutiqueEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  boutiqueLabel: {
    fontSize: 12,
    color: '#4B0082',
    fontWeight: '600',
  },

  // Idea submission
  ideaInput: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.3)',
    borderRadius: 12,
    padding: 14,
    color: '#4B0082',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  submitButtonText: {
    color: '#0a0e27',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    position: 'absolute',
    top: 44,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#4B0082',
    backgroundColor: 'rgba(250,235,215,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    color: '#4B0082',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuBtn: {
    position: 'absolute',
    top: 44,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#4B0082',
    backgroundColor: 'rgba(250,235,215,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menuBtnText: {
    color: '#4B0082',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Modal popup
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FAEBD7',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#4B0082',
    padding: 24,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBody: {
    fontSize: 15,
    color: '#4B0082',
    lineHeight: 22,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 8,
  },
  modalBullet: {
    color: '#FFD700',
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
  },
  modalListText: {
    flex: 1,
    fontSize: 14,
    color: '#4B0082',
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseText: {
    color: '#4B0082',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

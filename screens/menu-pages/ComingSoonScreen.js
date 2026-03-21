import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ImageBackground, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/alertUtils';
import {
  voteForFeature,
  removeFeatureVote,
  getFeatureVoteCounts,
  getUserFeatureVotes,
  submitFeatureIdea,
} from '../../services/firestoreService';

const COMING_SOON_FEATURES = [
  { key: 'boutique', emoji: '\uD83D\uDECD\uFE0F', label: 'Boutique' },
  { key: 'premium', emoji: '\uD83D\uDC51', label: 'Premium Membership' },
  { key: 'challenges', emoji: '\uD83C\uDFA8', label: 'Art Challenges' },
  { key: 'mentorship', emoji: '\uD83C\uDF1F', label: 'Mentorship' },
  { key: 'discussionPods', emoji: '\uD83D\uDCAC', label: 'Discussion Pods' },
];

const BOUTIQUE_ITEMS = [
  { emoji: '\uD83D\uDDBC\uFE0F', label: 'Prints' },
  { emoji: '\u2615', label: 'Mugs' },
  { emoji: '\uD83D\uDC55', label: 'Apparel' },
  { emoji: '\uD83D\uDCF1', label: 'Cases' },
];

export default function ComingSoonScreen({ route, navigation }) {
  const { user, userProfile } = useAuth();
  const [voteCounts, setVoteCounts] = useState({});
  const [userVotes, setUserVotes] = useState(new Set());
  const [ideaText, setIdeaText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

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
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Coming Soon</Text>

        {/* Boutique Preview */}
        <View style={styles.boutiqueCard}>
          <Text style={styles.boutiqueTitle}>Boutique</Text>
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
                <TouchableOpacity
                  key={feature.key}
                  style={[styles.voteRow, hasVoted && styles.voteRowVoted]}
                  onPress={() => handleVote(feature.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.voteEmoji}>{feature.emoji}</Text>
                  <Text style={styles.voteLabel}>{feature.label}</Text>
                  <View style={styles.voteBadge}>
                    <Text style={styles.voteBadgeText}>{count}</Text>
                  </View>
                  {hasVoted && <Text style={styles.voteCheck}>{'\u2713'}</Text>}
                </TouchableOpacity>
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
    alignItems: 'center',
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 24,
  },

  // Boutique card
  boutiqueCard: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: 28,
  },
  boutiqueTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  boutiqueSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
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
    fontSize: 36,
    marginBottom: 4,
  },
  boutiqueLabel: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },

  // Voting section
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 16,
  },
  voteList: {
    width: '100%',
    maxWidth: 400,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  voteRowVoted: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  voteEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  voteLabel: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  voteBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 8,
  },
  voteBadgeText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
  },
  voteCheck: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Idea submission
  ideaInput: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

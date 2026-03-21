import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Share,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/alertUtils';
import { checkAndGrantReferralTrial } from '../../services/firestoreService';
import { trackAction } from '../../services/analyticsService';

export default function ShareAppScreen({ navigation }) {
  const { user, userProfile, refreshProfile } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = userProfile?.referralCode || '';
  const referralCount = userProfile?.referralCount || 0;
  const goalReached = referralCount >= 5;

  useEffect(() => {
    // Check if user just crossed the 5-referral threshold
    if (goalReached && user) {
      checkAndGrantReferralTrial(user.uid).then((granted) => {
        if (granted) {
          refreshProfile();
          showAlert('Congratulations!', 'You\'ve earned 13 more premium days for referring 5 friends!');
        }
      });
    }
  }, [referralCount]);

  const copyToClipboard = async (text) => {
    if (Platform.OS === 'web' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else if (Platform.OS === 'web') {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleShare = async () => {
    try {
      const message = `Join me on MAGIC Tracker! Use my code: ${referralCode}. Download at 13magicalnights.com`;
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text: message });
      } else if (Platform.OS === 'web') {
        await copyToClipboard(message);
        showAlert('Copied!', 'Share message copied to clipboard.');
      } else {
        await Share.share({ message });
      }
      trackAction('share_app');
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.log('Share error:', error);
      }
    }
  };

  const handleCopyCode = async () => {
    try {
      if (Platform.OS === 'web') {
        await copyToClipboard(referralCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackAction('copy_referral_code');
    } catch (error) {
      console.log('Copy error:', error);
    }
  };

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Share the App</Text>
          <TouchableOpacity style={styles.hamburgerButton} onPress={() => navigation.navigate('Menu')}>
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* Referral Code Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Referral Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{referralCode}</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share with Friends</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy Code'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Referral Progress</Text>
          <Text style={styles.progressText}>{referralCount}/5 friends invited</Text>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(100, (referralCount / 5) * 100)}%` }]} />
          </View>

          {goalReached ? (
            <View style={styles.rewardCard}>
              <Text style={styles.rewardText}>You've earned 13 more premium days!</Text>
            </View>
          ) : (
            <Text style={styles.hintText}>
              Invite {5 - referralCount} more friend{5 - referralCount !== 1 ? 's' : ''} to earn 13 premium days!
            </Text>
          )}
        </View>

        {/* How it works */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.stepText}>1. Share your referral code with friends</Text>
          <Text style={styles.stepText}>2. They enter your code when signing up</Text>
          <Text style={styles.stepText}>3. Once 5 friends join, you earn 13 premium days!</Text>
        </View>

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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#8E0DD3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#8E0DD3',
    fontWeight: 'bold',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8E0DD3',
    textAlign: 'center',
    flex: 1,
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    backgroundColor: '#050d61',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#B8860B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerText: {
    fontSize: 24,
    color: '#8E0DD3',
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderWidth: 3,
    borderColor: '#8E0DD3',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 15,
  },
  codeContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  copyButton: {
    flex: 1,
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  copyButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 18,
    color: '#E0E0E0',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#1a2a4a',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 6,
  },
  rewardCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  rewardText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  hintText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  stepText: {
    color: '#E0E0E0',
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
  },
});

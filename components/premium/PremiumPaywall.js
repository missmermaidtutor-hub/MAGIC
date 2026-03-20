import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FEATURE_LABELS, getPremiumLabel } from '../../utils/premiumUtils';
import { trackAction } from '../../services/analyticsService';

/**
 * Premium paywall prompt shown when a free user tries to access a gated feature.
 *
 * Props:
 *   feature   – feature key from premiumUtils (e.g. 'advancedStats')
 *   message   – optional custom message (overrides default)
 *   compact   – if true, renders a small inline banner instead of full card
 *   onUpgrade – optional callback when "Upgrade" is tapped (future IAP flow)
 */
export default function PremiumPaywall({ feature, message, compact = false, onUpgrade }) {
  const label = FEATURE_LABELS[feature] || 'This Feature';
  const defaultMessage = `${label} is a premium feature. Upgrade to unlock it, or keep your streak going — every streak milestone ending in 13 earns a free trial!`;

  React.useEffect(() => {
    trackAction('premium_paywall_shown');
  }, []);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactLock}>&#x1F512;</Text>
        <Text style={styles.compactText}>{message || `${label} — Premium Feature`}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a3e', '#0a0e27']}
        style={styles.card}
      >
        <Text style={styles.lockIcon}>&#x2B50;</Text>
        <Text style={styles.title}>Premium Feature</Text>
        <Text style={styles.featureName}>{label}</Text>
        <Text style={styles.message}>{message || defaultMessage}</Text>
        <View style={styles.divider} />
        <Text style={styles.hint}>
          Streak milestones ending in 13 unlock a free 13-day trial!
        </Text>
        {onUpgrade && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => {
              trackAction('premium_upgrade_tapped');
              onUpgrade();
            }}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    width: '100%',
  },
  lockIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureName: {
    color: '#FFF8DC',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  message: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    width: '80%',
    marginBottom: 12,
  },
  hint: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  upgradeButton: {
    marginTop: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: '#0a0e27',
    fontSize: 14,
    fontWeight: '700',
  },
  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
  },
  compactLock: {
    fontSize: 14,
    marginRight: 8,
  },
  compactText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});

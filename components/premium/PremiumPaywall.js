import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { FEATURE_LABELS, FEATURE_DESCRIPTIONS, getPremiumLabel } from '../../utils/premiumUtils';
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
export default function PremiumPaywall({ feature, message, compact = false, align = 'right', onUpgrade }) {
  const label = FEATURE_LABELS[feature] || 'This Feature';
  const description = FEATURE_DESCRIPTIONS[feature];
  const defaultMessage = description
    ? `${description}\n\nThis is a premium feature. Upgrade to unlock it, or keep your streak going — reach a 13-day streak to earn a free trial!`
    : `${label} is a premium feature. Upgrade to unlock it, or keep your streak going — reach a 13-day streak to earn a free trial!`;

  React.useEffect(() => {
    trackAction('premium_paywall_shown');
  }, []);

  const isLeft = align === 'left';

  if (compact) {
    return (
      <View style={[styles.compactContainer, isLeft && styles.compactContainerLeft]}>
        <Text style={styles.compactLock}>&#x1F512;</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.compactText}>{message || `${label} — Premium Feature`}</Text>
          {!message && description && (
            <Text style={styles.compactDescription}>{description}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isLeft && styles.containerLeft]}>
      <View
        style={styles.card}
      >
        <Text style={styles.lockIcon}>&#x2B50;</Text>
        <Text style={styles.title}>Premium Feature</Text>
        <Text style={styles.featureName}>{label}</Text>
        <Text style={styles.message}>{message || defaultMessage}</Text>
        <View style={styles.divider} />
        <Text style={styles.hint}>
          Reach a 13-day streak to unlock a free trial!
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  containerLeft: {
    alignItems: 'flex-start',
  },
  card: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    width: '50%',
    backgroundColor: '#1a2244',
  },
  lockIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  title: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  featureName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  message: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    width: '80%',
    marginBottom: 12,
  },
  hint: {
    color: '#FFD700',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '600',
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
    backgroundColor: '#1a2244',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginVertical: 4,
    width: '100%',
  },
  compactContainerLeft: {
    alignSelf: 'flex-start',
  },
  compactLock: {
    fontSize: 14,
    marginRight: 8,
  },
  compactText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  compactDescription: {
    color: '#ffffff',
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
});

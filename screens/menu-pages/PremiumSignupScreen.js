import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ImageBackground, Platform } from 'react-native';
import { showAlert } from '../../utils/alertUtils';
import { useAuth } from '../../context/AuthContext';
import { getPremiumStatus, getPremiumLabel, formatPremiumExpiry } from '../../utils/premiumUtils';
import { PREMIUM_PRODUCTS, PREMIUM_FEATURE_LIST } from '../../config/premium';
import { purchasePackage, restorePurchases, getOfferings, presentPaywall, presentCustomerCenter } from '../../services/purchaseService';
import { redeemTrialTokenFirestore as redeemToken } from '../../services/firestoreService';
import { trackAction } from '../../services/analyticsService';

export default function PremiumSignupScreen({ navigation }) {
  const { user, userProfile, refreshProfile } = useAuth();
  // selectedProduct is an index into PREMIUM_PRODUCTS (for display) and packages (for purchasing)
  const [selectedIndex, setSelectedIndex] = useState(1); // default to annual
  const [packages, setPackages] = useState([]); // RevenueCat Package objects
  const [purchasing, setPurchasing] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      getOfferings().then(offering => {
        if (offering?.availablePackages?.length) {
          // Sort to match PREMIUM_PRODUCTS order (monthly first, annual second)
          const order = { monthly: 0, yearly: 1, lifetime: 2 };
          const sorted = [...offering.availablePackages].sort((a, b) =>
            (order[a.product.identifier] ?? 99) - (order[b.product.identifier] ?? 99)
          );
          setPackages(sorted);
        }
      });
    }
  }, []);

  const status = getPremiumStatus(userProfile);
  const isPaidPremium = status.isPremium && status.reason === 'paid';
  const tokenCount = userProfile?.trialTokens || 0;
  const hasActiveTrial = status.isPremium && status.reason !== 'paid';

  useEffect(() => {
    trackAction('premium_signup_viewed');
  }, []);

  const handleSubscribe = async () => {
    if (!user || purchasing) return;
    setPurchasing(true);
    trackAction('premium_subscribe_tapped');
    // Present the RevenueCat native paywall (configured in RevenueCat dashboard)
    const { purchased } = await presentPaywall(user.uid);
    if (purchased) await refreshProfile();
    setPurchasing(false);
  };

  const handleRestore = async () => {
    if (!user) return;
    trackAction('premium_restore_tapped');
    const success = await restorePurchases(user.uid);
    if (success) await refreshProfile();
  };

  const handleManageSubscription = async () => {
    trackAction('customer_center_opened');
    await presentCustomerCenter();
    // Refresh after returning — user may have cancelled or changed plan
    await refreshProfile();
  };

  const handleRedeemToken = async () => {
    if (!user || redeeming) return;
    setRedeeming(true);
    try {
      const ok = await redeemToken(user.uid);
      if (ok) {
        trackAction('trial_token_redeemed');
        await refreshProfile();
        showAlert('Trial Started!', 'Your 3-day premium trial is now active. Enjoy!');
      } else {
        showAlert('Oops', 'Could not redeem token. You may already have an active trial.');
      }
    } catch (e) {
      showAlert('Error', 'Could not redeem token. Try again later.');
    }
    setRedeeming(false);
  };

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Menu')}>
        <Text style={styles.menuBtnText}>{'\u2630'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>{'\u2190'}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Premium Membership</Text>

        {/* Current Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <Text style={styles.statusValue}>{getPremiumLabel(userProfile)}</Text>
          {!isPaidPremium && (
            <Text style={styles.statusExpiry}>{formatPremiumExpiry(userProfile)}</Text>
          )}
        </View>

        {/* Trial Token Section */}
        {tokenCount > 0 && !isPaidPremium && (
          <View style={styles.tokenCard}>
            <Text style={styles.tokenTitle}>
              {tokenCount} Trial Token{tokenCount > 1 ? 's' : ''} Available
            </Text>
            <Text style={styles.tokenDesc}>
              Each token grants 3 days of premium features (excluding the room behind the bookshelf).
            </Text>
            {hasActiveTrial ? (
              <Text style={styles.tokenNote}>
                You have an active trial — tokens will be here when it expires.
              </Text>
            ) : (
              <TouchableOpacity
                style={[styles.tokenButton, redeeming && { opacity: 0.6 }]}
                onPress={handleRedeemToken}
                disabled={redeeming}
              >
                <Text style={styles.tokenButtonText}>
                  {redeeming ? 'Redeeming...' : 'Use Trial Token'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isPaidPremium ? (
          /* Paid premium confirmation + Customer Center */
          <View style={styles.premiumConfirmCard}>
            <Text style={styles.premiumConfirmStar}>{'\u2B50'}</Text>
            <Text style={styles.premiumConfirmTitle}>You're a Premium Member!</Text>
            <Text style={styles.premiumConfirmBody}>
              Thank you for supporting MAGIC. You have full access to all premium features.
            </Text>
            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.manageBtn} onPress={handleManageSubscription}>
                <Text style={styles.manageBtnText}>Manage Subscription</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* Pricing cards */
          <>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            <View style={styles.plansRow}>
              {PREMIUM_PRODUCTS.map((product, index) => {
                const isSelected = selectedIndex === index;
                // Use live price from RevenueCat if available, fall back to config
                const livePrice = packages[index]?.product?.priceString ?? product.price;
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.planCard, isSelected && styles.planCardSelected]}
                    onPress={() => setSelectedIndex(index)}
                    activeOpacity={0.7}
                  >
                    {product.badge && (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{product.badge}</Text>
                      </View>
                    )}
                    <Text style={[styles.planTitle, isSelected && styles.planTitleSelected]}>
                      {product.title}
                    </Text>
                    <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                      {livePrice}
                    </Text>
                    <Text style={[styles.planPeriod, isSelected && styles.planPeriodSelected]}>
                      {product.period}
                    </Text>
                    <Text style={[styles.planDesc, isSelected && styles.planDescSelected]}>
                      {product.description}
                    </Text>
                    {isSelected && <View style={styles.planCheck}><Text style={styles.planCheckText}>{'\u2713'}</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.subscribeButton, purchasing && { opacity: 0.6 }]}
              onPress={handleSubscribe}
              disabled={purchasing}
            >
              <Text style={styles.subscribeButtonText}>
                {purchasing ? 'Processing...' : 'Subscribe Now'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.restoreLink} onPress={handleRestore}>
              <Text style={styles.restoreLinkText}>Restore Purchases</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Feature List */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Premium Features</Text>
        <View style={styles.featureList}>
          {PREMIUM_FEATURE_LIST.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureStar}>{'\u2605'}</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
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
    alignItems: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 20,
  },
  menuBtn: {
    position: 'absolute',
    top: 44,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menuBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backBtn: {
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
  backBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Status card
  statusCard: {
    backgroundColor: 'rgba(75, 0, 130, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(75, 0, 130, 0.3)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 13,
    color: '#4B0082',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B0082',
  },
  statusExpiry: {
    fontSize: 13,
    color: '#4B0082',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Trial token card
  tokenCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 14,
    padding: 18,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: 24,
  },
  tokenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  tokenDesc: {
    fontSize: 13,
    color: '#4B0082',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  tokenNote: {
    fontSize: 13,
    color: '#4B0082',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tokenButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  tokenButtonText: {
    color: '#0a0e27',
    fontSize: 15,
    fontWeight: '700',
  },

  // Paid premium confirmation
  premiumConfirmCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: 24,
  },
  premiumConfirmStar: {
    fontSize: 48,
    marginBottom: 12,
  },
  premiumConfirmTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 8,
  },
  premiumConfirmBody: {
    fontSize: 14,
    color: '#4B0082',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  manageBtn: {
    borderWidth: 1,
    borderColor: '#4B0082',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  manageBtnText: {
    color: '#4B0082',
    fontSize: 14,
    fontWeight: '600',
  },

  // Plans
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 16,
  },
  plansRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  planCard: {
    flex: 1,
    backgroundColor: 'rgba(75, 0, 130, 0.06)',
    borderWidth: 2,
    borderColor: 'rgba(75, 0, 130, 0.25)',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  planCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  planBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  planBadgeText: {
    color: '#0a0e27',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B0082',
    marginBottom: 8,
  },
  planTitleSelected: {
    color: '#4B0082',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4B0082',
  },
  planPriceSelected: {
    color: '#4B0082',
  },
  planPeriod: {
    fontSize: 13,
    color: '#4B0082',
    marginBottom: 4,
  },
  planPeriodSelected: {
    color: '#4B0082',
  },
  planDesc: {
    fontSize: 12,
    color: '#4B0082',
    fontStyle: 'italic',
  },
  planDescSelected: {
    color: '#4B0082',
  },
  planCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planCheckText: {
    color: '#0a0e27',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Subscribe button
  subscribeButton: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: '#0a0e27',
    fontSize: 17,
    fontWeight: '700',
  },
  restoreLink: {
    marginBottom: 8,
  },
  restoreLinkText: {
    color: '#4B0082',
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  // Feature list
  featureList: {
    width: '100%',
    maxWidth: 400,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 8,
  },
  featureStar: {
    color: '#FFD700',
    fontSize: 14,
    marginRight: 10,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#4B0082',
    lineHeight: 20,
  },
});

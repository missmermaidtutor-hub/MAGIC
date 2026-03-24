import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getPremiumStatus, getPremiumLabel, formatPremiumExpiry } from '../../utils/premiumUtils';
import { PREMIUM_PRODUCTS, PREMIUM_FEATURE_LIST } from '../../config/premium';
import { purchasePackage, restorePurchases } from '../../services/purchaseService';
import { trackAction } from '../../services/analyticsService';

export default function PremiumSignupScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState(PREMIUM_PRODUCTS[1]?.id || PREMIUM_PRODUCTS[0]?.id);
  const [purchasing, setPurchasing] = useState(false);

  const status = getPremiumStatus(userProfile);
  const isPaidPremium = status.isPremium && status.reason === 'paid';

  useEffect(() => {
    trackAction('premium_signup_viewed');
  }, []);

  const handleSubscribe = async () => {
    if (!user || purchasing) return;
    setPurchasing(true);
    trackAction('premium_subscribe_tapped');
    await purchasePackage(selectedProduct, user.uid);
    setPurchasing(false);
  };

  const handleRestore = async () => {
    if (!user) return;
    trackAction('premium_restore_tapped');
    await restorePurchases(user.uid);
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

        {isPaidPremium ? (
          /* Paid premium confirmation */
          <View style={styles.premiumConfirmCard}>
            <Text style={styles.premiumConfirmStar}>{'\u2B50'}</Text>
            <Text style={styles.premiumConfirmTitle}>You're a Premium Member!</Text>
            <Text style={styles.premiumConfirmBody}>
              Thank you for supporting MAGIC. You have full access to all premium features.
            </Text>
          </View>
        ) : (
          /* Pricing cards */
          <>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            <View style={styles.plansRow}>
              {PREMIUM_PRODUCTS.map((product) => {
                const isSelected = selectedProduct === product.id;
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.planCard, isSelected && styles.planCardSelected]}
                    onPress={() => setSelectedProduct(product.id)}
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
                      {product.price}
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

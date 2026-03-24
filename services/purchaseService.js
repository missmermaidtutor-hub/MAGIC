/**
 * Purchase service — stub implementation.
 *
 * TODO: Integrate RevenueCat SDK (react-native-purchases) before
 *       enabling real in-app purchases. For now every purchase
 *       call shows a "Coming Soon" alert.
 */

import { PREMIUM_PRODUCTS } from '../config/premium';
import { showAlert } from '../utils/alertUtils';

/**
 * Initialize the purchase SDK.
 * TODO: Call Purchases.configure() with the correct API key here.
 */
export const initPurchases = () => {
  console.log('[PurchaseService] initPurchases stub — RevenueCat not yet integrated');
};

/**
 * Fetch available offerings / products.
 * TODO: Replace with Purchases.getOfferings() when RevenueCat is wired up.
 */
export const getOfferings = async () => {
  return PREMIUM_PRODUCTS;
};

/**
 * Purchase a subscription.
 * @param {string} productId — one of the PREMIUM_PRODUCTS ids
 * @param {string} uid — current user's Firebase UID
 * TODO: Replace with Purchases.purchasePackage() + Firestore update.
 */
export const purchasePackage = async (productId, uid) => {
  console.log('[PurchaseService] purchasePackage stub:', productId, uid);
  showAlert(
    'Coming Soon',
    'Premium subscriptions will be available soon! Keep your streak going to earn free premium trials in the meantime.'
  );
  return false;
};

/**
 * Restore previous purchases.
 * @param {string} uid — current user's Firebase UID
 * TODO: Replace with Purchases.restorePurchases() + Firestore sync.
 */
export const restorePurchases = async (uid) => {
  console.log('[PurchaseService] restorePurchases stub:', uid);
  showAlert(
    'Coming Soon',
    'Purchase restoration will be available once premium subscriptions launch.'
  );
  return false;
};

/**
 * Check current subscription status for a user.
 * TODO: Replace with Purchases.getCustomerInfo() check.
 */
export const checkSubscriptionStatus = async (uid) => {
  console.log('[PurchaseService] checkSubscriptionStatus stub:', uid);
  return { isPremium: false };
};

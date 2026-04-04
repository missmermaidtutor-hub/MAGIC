/**
 * Purchase service — RevenueCat (react-native-purchases + react-native-purchases-ui).
 *
 * Entitlement: "MAGIC Pro"
 * Products:    monthly, yearly, lifetime
 *
 * On web: purchases are not available (RevenueCat is native-only).
 * Web users see a message directing them to the iOS/Android app.
 */

import { Platform } from 'react-native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { REVENUECAT_API_KEY, ENTITLEMENT_ID } from '../config/premium';
import { showAlert } from '../utils/alertUtils';

// Lazy-load native SDKs — crash on web if imported at module level
let _Purchases = null;
let _RevenueCatUI = null;

const getPurchases = () => {
  if (Platform.OS === 'web') return null;
  if (!_Purchases) _Purchases = require('react-native-purchases').default;
  return _Purchases;
};

const getRevenueCatUI = () => {
  if (Platform.OS === 'web') return null;
  if (!_RevenueCatUI) _RevenueCatUI = require('react-native-purchases-ui').default;
  return _RevenueCatUI;
};

/**
 * Initialize RevenueCat. Call once after user authenticates.
 * Pass the Firebase UID so RevenueCat ties purchases to the account.
 */
export const initPurchases = (uid) => {
  if (Platform.OS === 'web') return;
  try {
    const sdk = getPurchases();
    const { LOG_LEVEL } = require('react-native-purchases');
    sdk.setLogLevel(LOG_LEVEL.ERROR);
    const apiKey = Platform.OS === 'ios'
      ? REVENUECAT_API_KEY.ios
      : REVENUECAT_API_KEY.android;
    sdk.configure({ apiKey, appUserID: uid });
  } catch (e) {
    console.log('[PurchaseService] initPurchases error:', e);
  }
};

/**
 * Fetch current offerings from RevenueCat.
 * Returns the current Offering object (contains packages), or null on error/web.
 */
export const getOfferings = async () => {
  const sdk = getPurchases();
  if (!sdk) return null;
  try {
    const offerings = await sdk.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    console.log('[PurchaseService] getOfferings error:', e);
    return null;
  }
};

/**
 * Write confirmed premium status to Firestore user profile.
 * Called after any successful purchase or restore.
 */
const syncPremiumToFirestore = async (uid, customerInfo) => {
  try {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    if (!entitlement) return;

    const productId = entitlement.productIdentifier;
    const isLifetime = productId === 'lifetime' || !entitlement.expirationDate;

    // Lifetime purchases have no expiry date — set premiumExpiry to null (permanent)
    const expiry = isLifetime ? null : new Date(entitlement.expirationDate);

    await updateDoc(doc(db, 'users', uid), {
      isPremium: true,
      premiumExpiry: expiry,
      premiumPlan: productId,
      premiumIsLifetime: isLifetime,
      revenueCatCustomerId: customerInfo.originalAppUserId,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.log('[PurchaseService] Firestore sync error:', e);
  }
};

/**
 * Revoke premium in Firestore (called on subscription lapse).
 */
const revokePremiumInFirestore = async (uid) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      isPremium: false,
      premiumExpiry: null,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.log('[PurchaseService] Firestore revoke error:', e);
  }
};

/**
 * Purchase a package.
 * @param {Package} pkg — RevenueCat Package object from getOfferings()
 * @param {string} uid — Firebase UID
 * Returns true on success, false on cancel/failure.
 */
export const purchasePackage = async (pkg, uid) => {
  if (Platform.OS === 'web') {
    showAlert(
      'Download the App',
      'Subscriptions are available in the MAGIC iOS and Android apps. Visit the App Store or Google Play to subscribe.'
    );
    return false;
  }
  const sdk = getPurchases();
  if (!sdk) return false;
  try {
    const { customerInfo } = await sdk.purchasePackage(pkg);
    if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
      await syncPremiumToFirestore(uid, customerInfo);
      showAlert('Welcome to Premium!', 'You now have full access to all MAGIC premium features.');
      return true;
    }
    return false;
  } catch (e) {
    if (!e.userCancelled) {
      console.log('[PurchaseService] purchasePackage error:', e);
      showAlert('Purchase Failed', 'Could not complete your purchase. Please try again.');
    }
    return false;
  }
};

/**
 * Restore previous purchases (user reinstalled, switched device, etc).
 * @param {string} uid — Firebase UID
 * Returns true if premium was restored.
 */
export const restorePurchases = async (uid) => {
  if (Platform.OS === 'web') {
    showAlert('App Only', 'Restore purchases is available in the iOS and Android apps.');
    return false;
  }
  const sdk = getPurchases();
  if (!sdk) return false;
  try {
    const customerInfo = await sdk.restorePurchases();
    if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
      await syncPremiumToFirestore(uid, customerInfo);
      showAlert('Restored!', 'Your premium subscription has been restored.');
      return true;
    }
    showAlert('No Subscription Found', 'No active premium subscription found for this account.');
    return false;
  } catch (e) {
    console.log('[PurchaseService] restorePurchases error:', e);
    showAlert('Restore Failed', 'Could not restore purchases. Please try again.');
    return false;
  }
};

/**
 * Check current subscription status with RevenueCat and sync to Firestore.
 * Call on app launch (after initPurchases) to catch renewals/lapses.
 * @param {string} uid — Firebase UID
 */
export const checkSubscriptionStatus = async (uid) => {
  const sdk = getPurchases();
  if (!sdk) return { isPremium: false };
  try {
    const customerInfo = await sdk.getCustomerInfo();
    const isPremium = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    if (isPremium) {
      await syncPremiumToFirestore(uid, customerInfo);
    } else {
      await revokePremiumInFirestore(uid);
    }
    return { isPremium };
  } catch (e) {
    console.log('[PurchaseService] checkSubscriptionStatus error:', e);
    return { isPremium: false };
  }
};

/**
 * Present the RevenueCat native Paywall (configured in RevenueCat dashboard).
 * Returns { purchased: bool } — true if user completed a purchase.
 * @param {string} uid — Firebase UID (to sync Firestore after purchase)
 */
export const presentPaywall = async (uid) => {
  if (Platform.OS === 'web') {
    showAlert(
      'Download the App',
      'Subscriptions are available in the MAGIC iOS and Android apps.'
    );
    return { purchased: false };
  }
  const ui = getRevenueCatUI();
  if (!ui) return { purchased: false };
  try {
    const result = await ui.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
    });
    // result.userCancelled is true if dismissed without purchase
    if (!result.userCancelled) {
      const customerInfo = await getPurchases().getCustomerInfo();
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        await syncPremiumToFirestore(uid, customerInfo);
        return { purchased: true };
      }
    }
    return { purchased: false };
  } catch (e) {
    console.log('[PurchaseService] presentPaywall error:', e);
    return { purchased: false };
  }
};

/**
 * Present the RevenueCat Customer Center (subscription management sheet).
 * Allows users to: view subscription, cancel, request refund, restore.
 * Call from a "Manage Subscription" button for paid members.
 */
export const presentCustomerCenter = async () => {
  if (Platform.OS === 'web') {
    showAlert(
      'App Only',
      'Subscription management is available in the iOS and Android apps.'
    );
    return;
  }
  const ui = getRevenueCatUI();
  if (!ui) return;
  try {
    await ui.presentCustomerCenter();
  } catch (e) {
    console.log('[PurchaseService] presentCustomerCenter error:', e);
  }
};

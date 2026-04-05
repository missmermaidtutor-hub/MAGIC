/**
 * purchaseService.web.js — Web stub for RevenueCat purchase service.
 *
 * Expo automatically uses this file instead of purchaseService.js when
 * building for web. This prevents react-native-purchases (native SDK)
 * from being bundled in the web build, which would crash the browser.
 */

import { showAlert } from '../utils/alertUtils';

const WEB_MSG = 'Subscriptions are available in the MAGIC iOS and Android apps.';

export const initPurchases = () => {};

export const getOfferings = async () => null;

export const purchasePackage = async () => {
  showAlert('Download the App', WEB_MSG);
  return false;
};

export const restorePurchases = async () => {
  showAlert('App Only', 'Restore purchases is available in the iOS and Android apps.');
  return false;
};

export const checkSubscriptionStatus = async () => ({ isPremium: false });

export const presentPaywall = async () => {
  showAlert('Download the App', WEB_MSG);
  return { purchased: false };
};

export const presentCustomerCenter = async () => {
  showAlert('App Only', 'Subscription management is available in the iOS and Android apps.');
};

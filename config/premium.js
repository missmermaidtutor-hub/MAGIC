/**
 * Premium membership configuration.
 *
 * Central source for product pricing, feature lists,
 * and RevenueCat API keys.
 */

// RevenueCat API keys
// iOS test key active — replace with production key before App Store submission
export const REVENUECAT_API_KEY = {
  ios: 'test_CVMtuxcVnVvUYXCCjLSitPvTece',
  android: 'goog_REPLACE_WITH_REAL_KEY',  // TODO: add Android key from RevenueCat dashboard
};

// RevenueCat entitlement identifier — must match exactly in RevenueCat dashboard
export const ENTITLEMENT_ID = 'MAGIC Pro';

// Product identifiers — must match exactly in App Store Connect / Google Play Console
// and in the RevenueCat dashboard products list
export const PREMIUM_PRODUCTS = [
  {
    id: 'monthly',
    title: 'Monthly',
    price: '$2.99',
    period: '/month',
    description: 'Billed monthly',
  },
  {
    id: 'yearly',
    title: 'Yearly',
    price: '$29.99',
    period: '/year',
    description: 'Save over 15%!',
    badge: 'Best Value',
  },
  {
    id: 'lifetime',
    title: 'Lifetime',
    price: '$79.99',
    period: 'one-time',
    description: 'Pay once, keep forever',
    badge: 'Best Deal',
  },
];

export const PREMIUM_FEATURE_LIST = [
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

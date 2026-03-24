/**
 * Premium membership configuration.
 *
 * Central source for product pricing, feature lists,
 * and RevenueCat API keys.
 */

// TODO: Replace with real RevenueCat API keys before app store submission
export const REVENUECAT_API_KEY = {
  ios: 'appl_REPLACE_WITH_REAL_KEY',     // TODO: Apple API key from RevenueCat dashboard
  android: 'goog_REPLACE_WITH_REAL_KEY',  // TODO: Google API key from RevenueCat dashboard
};

export const PREMIUM_PRODUCTS = [
  {
    id: 'magic_premium_monthly',
    title: 'Monthly',
    price: '$2.99',
    period: '/month',
    description: 'Billed monthly',
  },
  {
    id: 'magic_premium_annual',
    title: 'Annual',
    price: '$29.99',
    period: '/year',
    description: 'Save $5.89!',
    badge: 'Best Value',
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

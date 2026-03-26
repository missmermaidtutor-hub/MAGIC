import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Premium / Freemium gating logic for MAGIC Tracker.
 *
 * Trial rules:
 *   1. Reaching a streak that ends in 13 (13, 113, 213, …) grants a
 *      13-day premium trial (from the moment it's detected).
 *   2. Paying users have isPremium = true with optional premiumExpiry.
 *
 * New users start FREE — no automatic premium grace period.
 * Premium is earned through streaks or paid subscription.
 *
 * This module is the SINGLE source of truth for premium checks.
 * Screens should never duplicate this logic.
 */

// ── Helpers ──

/** Days since account creation (1 = creation day). */
export const getMemberDayCount = (userProfile) => {
  if (!userProfile?.createdAt) return 0;
  const createdDate =
    userProfile.createdAt?.toDate?.() ??
    (userProfile.createdAt?.seconds
      ? new Date(userProfile.createdAt.seconds * 1000)
      : new Date(userProfile.createdAt));
  return Math.floor((Date.now() - createdDate.getTime()) / 86400000) + 1;
};

/** True when the streak number ends in 13 (13, 113, 213, 1013 …). */
export const isStreakMilestone = (streak) => {
  if (streak < 13) return false;
  return streak % 100 === 13;
};

// ── Core premium check ──

/**
 * Determine if the user currently has premium access.
 *
 * Priority order:
 *   1. Paid subscriber (isPremium === true, expiry not yet passed).
 *   2. Active premium trial (premiumTrialExpiry in the future).
 *
 * Note: New users do NOT get automatic premium access.
 * Premium is earned through paid subscription or streak milestones.
 *
 * Returns { isPremium: boolean, reason: string }.
 */
export const getPremiumStatus = (userProfile) => {
  if (!userProfile) return { isPremium: false, reason: 'no_profile' };

  // 1. Paid premium
  if (userProfile.isPremium) {
    if (userProfile.premiumExpiry) {
      const expiry =
        userProfile.premiumExpiry?.toDate?.() ??
        (userProfile.premiumExpiry?.seconds
          ? new Date(userProfile.premiumExpiry.seconds * 1000)
          : new Date(userProfile.premiumExpiry));
      if (new Date() <= expiry) {
        return { isPremium: true, reason: 'paid' };
      }
      // Expired — fall through to check other paths
    } else {
      // No expiry set = lifetime / active subscription
      return { isPremium: true, reason: 'paid' };
    }
  }

  // 2. Active streak-based trial
  if (userProfile.premiumTrialExpiry) {
    const trialExpiry =
      userProfile.premiumTrialExpiry?.toDate?.() ??
      (userProfile.premiumTrialExpiry?.seconds
        ? new Date(userProfile.premiumTrialExpiry.seconds * 1000)
        : new Date(userProfile.premiumTrialExpiry));
    if (new Date() <= trialExpiry) {
      const daysLeft = Math.ceil((trialExpiry.getTime() - Date.now()) / 86400000);
      return { isPremium: true, reason: 'streak_trial', daysLeft };
    }
  }

  return { isPremium: false, reason: 'free' };
};

/** Simple boolean shortcut. */
export const checkPremium = (userProfile) => getPremiumStatus(userProfile).isPremium;

// ── Feature-level gating ──

/**
 * Feature keys and their access rules.
 *
 * Free features (always available):
 *   - Current streak + longest streak display
 *   - Basic curated gallery (up to 10 images)
 *   - Writing today's manifest entry
 *   - Setting today's goal
 *   - Voting on courages
 *   - Sharing courage
 *   - Discussion pods (joining)
 *
 * Premium features:
 *   - advancedStats       → detailed per-MAGIC-category stats, goal rate
 *   - inspiringOthers     → "how many times your art inspired others" stat
 *   - pastDiaryEntries    → view past manifest/journal entries
 *   - favoriteQuotes      → favorite quote archive
 *   - unlimitedCurated    → 25-slot curated gallery (free = 10)
 *   - goalHistory         → full goal history + stats
 *   - earlyCuratedAccess  → curated gallery before 13-day mark
 *   - studioFullColors    → hue bar, opacity, custom hex in Art Studio
 *   - studioAdvancedText  → extra fonts, italic, underline, strikethrough
 *   - galleryOrganizing   → folders, custom ordering, tags, sorting
 */

const FEATURE_RULES = {
  advancedStats: (isPremium) => isPremium,
  inspiringOthers: (isPremium) => isPremium,
  pastDiaryEntries: (isPremium) => isPremium,
  favoriteQuotes: (isPremium) => isPremium,
  unlimitedCurated: (isPremium) => isPremium,
  goalHistory: (isPremium) => isPremium,
  earlyCuratedAccess: (isPremium) => isPremium,
  studioFullColors: (isPremium) => isPremium,
  studioAdvancedText: (isPremium) => isPremium,
  pseudonymChange: (isPremium) => isPremium,
  galleryOrganizing: (isPremium) => isPremium,
  streakPause: (isPremium) => isPremium,
  streakSaver: (isPremium) => isPremium,
};

/**
 * Check if a specific feature is available for this user.
 * Returns boolean.
 */
export const canAccessFeature = (feature, userProfile) => {
  const { isPremium } = getPremiumStatus(userProfile);
  const rule = FEATURE_RULES[feature];
  if (!rule) return true; // unknown feature = allow
  return rule(isPremium);
};

/** Max curated gallery slots for current tier. */
export const getCuratedLimit = (userProfile) => {
  return canAccessFeature('unlimitedCurated', userProfile) ? 25 : 10;
};

// ── Trial granting ──

/**
 * Check if a streak milestone should grant a trial, and if so
 * return the new expiry date. Does NOT write to Firestore — the
 * caller is responsible for persisting.
 *
 * Returns Date | null.
 */
export const checkStreakTrialEligibility = async (streak, userProfile) => {
  if (!isStreakMilestone(streak)) return null;

  // Don't grant if user is already premium (paid or active trial)
  const status = getPremiumStatus(userProfile);
  if (status.isPremium && status.reason === 'paid') return null;

  // Check if we already granted a trial for this exact milestone
  const grantedKey = `premium_trial_granted_${streak}`;
  const alreadyGranted = await AsyncStorage.getItem(grantedKey);
  if (alreadyGranted) return null;

  // Grant 13-day trial
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 13);

  // Mark as granted so we don't re-grant on next app load
  await AsyncStorage.setItem(grantedKey, 'true');

  return expiry;
};

// ── Display helpers ──

/** Human-readable premium status label. */
export const getPremiumLabel = (userProfile) => {
  const status = getPremiumStatus(userProfile);
  if (!status.isPremium) return 'Free';
  switch (status.reason) {
    case 'paid':
      return 'Premium';
    case 'streak_trial':
      return `Premium Trial (${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left)`;
    default:
      return 'Premium';
  }
};

/** Human-readable expiry/status string for display on PremiumSignupScreen. */
export const formatPremiumExpiry = (userProfile) => {
  const status = getPremiumStatus(userProfile);
  if (!status.isPremium) return 'No active premium access';
  switch (status.reason) {
    case 'paid': {
      if (userProfile.premiumExpiry) {
        const expiry =
          userProfile.premiumExpiry?.toDate?.() ??
          (userProfile.premiumExpiry?.seconds
            ? new Date(userProfile.premiumExpiry.seconds * 1000)
            : new Date(userProfile.premiumExpiry));
        return `Premium until ${expiry.toLocaleDateString()}`;
      }
      return 'Active premium subscription';
    }
    case 'streak_trial': {
      if (userProfile.premiumTrialExpiry) {
        const trialExpiry =
          userProfile.premiumTrialExpiry?.toDate?.() ??
          (userProfile.premiumTrialExpiry?.seconds
            ? new Date(userProfile.premiumTrialExpiry.seconds * 1000)
            : new Date(userProfile.premiumTrialExpiry));
        return `Premium trial until ${trialExpiry.toLocaleDateString()}`;
      }
      return `Premium trial \u2014 ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} remaining`;
    }
    default:
      return 'Premium active';
  }
};

/** Feature name → description of what the feature does. */
export const FEATURE_DESCRIPTIONS = {
  advancedStats: 'See your progress across all 5 MAGIC categories with per-day breakdowns and goal completion rates.',
  inspiringOthers: 'Track how many times other artists have saved your curated artwork to their inspiration gallery.',
  pastDiaryEntries: 'Browse and revisit your past journal entries, manifests, and reflections from any date.',
  favoriteQuotes: 'Review your archive of hearted quotes and revisit the words that inspired you.',
  unlimitedCurated: 'Expand your curated gallery from 10 to 25 works to showcase more of your best art.',
  goalHistory: 'View your complete goal history with stats on completion rates and streaks of met goals.',
  earlyCuratedAccess: 'Access the curated gallery before the standard 13-day membership waiting period.',
  studioFullColors: 'Unlock the color mixing panel, opacity controls, and custom hex input in the Art Studio.',
  studioAdvancedText: 'Add italic, underline, strikethrough formatting plus font families and all 12 colors to text overlays.',
  pseudonymChange: 'Change your artist pseudonym as often as you like with premium access.',
  galleryOrganizing: 'Organize your gallery with folders, custom ordering, tags, and sorting to showcase your art your way.',
  streakPause: 'Take a break without losing your streak. Pause up to 3 days per month while keeping your progress intact or save them up for one big vacation.',
  streakSaver: 'Automatically save your streak when you miss a day. One free save per 13-day cycle.',
};

/** Feature name → user-friendly label for paywalls. */
export const FEATURE_LABELS = {
  advancedStats: 'Advanced Statistics',
  inspiringOthers: 'Inspiration Impact',
  pastDiaryEntries: 'Past Diary Entries',
  favoriteQuotes: 'Favorite Quote Archive',
  unlimitedCurated: 'Expanded Curated Gallery',
  goalHistory: 'Goal History & Stats',
  earlyCuratedAccess: 'Early Gallery Access',
  studioFullColors: 'Full Color Controls',
  studioAdvancedText: 'Advanced Text Styling',
  pseudonymChange: 'Pseudonym Changes',
  galleryOrganizing: 'Gallery Organizing',
  streakPause: 'Streak Pause',
  streakSaver: 'Streak Saver',
};

// ── Pseudonym change gating ──

/**
 * Check if a user can change their pseudonym.
 * First change is always free. After that, requires premium.
 */
export const canChangePseudonym = (userProfile) => {
  if (!userProfile) return false;
  // First change is always free
  if ((userProfile.pseudonymChangeCount || 0) === 0) return true;
  // Premium users can change unlimited
  return getPremiumStatus(userProfile).isPremium;
};

// ── Share App gating ──

/**
 * Check if a user can access the Share App screen.
 * Requires having had a premium trial that has expired (completed the cycle).
 */
export const canShareApp = (userProfile) => {
  if (!userProfile) return false;
  // Must have had a premium trial that has expired
  if (!userProfile.premiumTrialExpiry) return false;
  const expiry =
    userProfile.premiumTrialExpiry?.toDate?.() ??
    (userProfile.premiumTrialExpiry?.seconds
      ? new Date(userProfile.premiumTrialExpiry.seconds * 1000)
      : new Date(userProfile.premiumTrialExpiry));
  return new Date() > expiry; // Trial has ended = cycle complete
};

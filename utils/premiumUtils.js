import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Premium / Freemium gating logic for MAGIC Tracker.
 *
 * THE UNBREAKABLE PREMIUM LAW:
 * Premium features are ALWAYS locked, with exactly 3 exceptions:
 *   1. Paid premium -> FULL access (ALL features including bookcase)
 *   2. First 13-day streak -> one-time 13-day LIMITED trial (no bookcase)
 *   3. Active days > 100 ending in 13 (113, 213, 313...) -> earn a 3-day trial TOKEN (redeemable anytime, no bookcase)
 *
 * "Limited" = all premium features EXCEPT the room behind the bookshelf (Inspiring Others).
 *
 * This module is the SINGLE source of truth for premium checks.
 * Screens should never duplicate this logic.
 */

// ── Admin Override (in-memory only, resets on app restart) ──

let _adminOverride = null; // null | 'full' | 'limited' | 'free'
export const setAdminPremiumOverride = (val) => { _adminOverride = val; };
export const getAdminPremiumOverride = () => _adminOverride;

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

/** True when the active day count is > 100 and ends in 13 (113, 213, 313, ...). */
export const isActiveDayMilestone = (activeDayCount) => {
  if (activeDayCount <= 100) return false;
  return activeDayCount % 100 === 13;
};

// ── Core premium check ──

/**
 * Determine if the user currently has premium access.
 *
 * Priority order:
 *   0. Admin override (if set — for preview/testing)
 *   1. Paid subscriber (isPremium === true, expiry not yet passed).
 *   2. Active premium trial (premiumTrialExpiry in the future).
 *
 * Returns { isPremium: boolean, reason: string, daysLeft?: number }.
 */
export const getPremiumStatus = (userProfile) => {
  // 0. Admin override
  if (_adminOverride) {
    switch (_adminOverride) {
      case 'full':
        return { isPremium: true, reason: 'paid' };
      case 'limited':
        return { isPremium: true, reason: 'limited_trial', daysLeft: 99 };
      case 'free':
        return { isPremium: false, reason: 'free' };
    }
  }

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

  // 2. New-user grace period: first 13 member days = limited trial (no bookcase)
  const memberDays = getMemberDayCount(userProfile);
  if (memberDays <= 13) {
    return { isPremium: true, reason: 'new_user_trial', daysLeft: 14 - memberDays };
  }

  // 3. Active trial (streak-based or active-day token)
  if (userProfile.premiumTrialExpiry) {
    const trialExpiry =
      userProfile.premiumTrialExpiry?.toDate?.() ??
      (userProfile.premiumTrialExpiry?.seconds
        ? new Date(userProfile.premiumTrialExpiry.seconds * 1000)
        : new Date(userProfile.premiumTrialExpiry));
    if (new Date() <= trialExpiry) {
      const daysLeft = Math.ceil((trialExpiry.getTime() - Date.now()) / 86400000);
      // Determine specific trial type from profile field
      const trialType = userProfile.premiumTrialType;
      if (trialType === 'streak_13') {
        return { isPremium: true, reason: 'streak_13_trial', daysLeft };
      } else if (trialType === 'active_day') {
        return { isPremium: true, reason: 'active_day_trial', daysLeft };
      }
      // Backward compat for old trials without premiumTrialType
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
 * Premium features (all trials + paid):
 *   - advancedStats, pastDiaryEntries, favoriteQuotes, unlimitedCurated,
 *     goalHistory, earlyCuratedAccess, studioFullColors, studioAdvancedText,
 *     pseudonymChange, galleryOrganizing, streakPause, streakSaver
 *
 * PAID ONLY (bookcase — never available during trials):
 *   - inspiringOthers
 */

const FEATURE_RULES = {
  advancedStats: ({ isPremium }) => isPremium,
  inspiringOthers: ({ isPremium, reason }) => isPremium && reason === 'paid',
  pastDiaryEntries: ({ isPremium }) => isPremium,
  favoriteQuotes: ({ isPremium }) => isPremium,
  unlimitedCurated: ({ isPremium }) => isPremium,
  goalHistory: ({ isPremium }) => isPremium,
  earlyCuratedAccess: ({ isPremium }) => isPremium,
  studioFullColors: ({ isPremium }) => isPremium,
  studioAdvancedText: ({ isPremium }) => isPremium,
  pseudonymChange: ({ isPremium }) => isPremium,
  galleryOrganizing: ({ isPremium }) => isPremium,
  streakPause: ({ isPremium }) => isPremium,
  streakSaver: ({ isPremium }) => isPremium,
};

/**
 * Check if a specific feature is available for this user.
 * Returns boolean.
 */
export const canAccessFeature = (feature, userProfile) => {
  const status = getPremiumStatus(userProfile);
  const rule = FEATURE_RULES[feature];
  if (!rule) return true; // unknown feature = allow
  return rule(status);
};

/** Max curated gallery slots for current tier. */
export const getCuratedLimit = (userProfile) => {
  return canAccessFeature('unlimitedCurated', userProfile) ? 25 : 10;
};

// ── Trial granting ──

/**
 * Check if the user's first 13-day streak should grant a trial.
 * Only triggers at streak === 13, and only once ever (streak13TrialUsed flag).
 *
 * Returns { expiry: Date, trialType: 'streak_13' } | null.
 */
export const checkStreakTrialEligibility = async (streak, userProfile) => {
  // Only triggers at exactly 13
  if (streak !== 13) return null;

  // Don't grant if user is already paid premium
  const status = getPremiumStatus(userProfile);
  if (status.isPremium && status.reason === 'paid') return null;

  // One-time only: check Firestore flag
  if (userProfile?.streak13TrialUsed) return null;

  // Also check AsyncStorage as a local dedup
  const alreadyGranted = await AsyncStorage.getItem('streak_13_trial_granted');
  if (alreadyGranted) return null;

  // Grant 13-day trial
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 13);

  // Mark locally
  await AsyncStorage.setItem('streak_13_trial_granted', 'true');

  return { expiry, trialType: 'streak_13' };
};

/**
 * Check if an active day count milestone should award a trial token.
 * Triggers when activeDayCount > 100 and activeDayCount % 100 === 13 (113, 213, 313...).
 * Does NOT start a trial — just awards a banked token.
 *
 * Returns true if token should be awarded, false otherwise.
 */
export const checkActiveDayTokenEligibility = async (activeDayCount, userProfile) => {
  if (!isActiveDayMilestone(activeDayCount)) return false;

  // Don't award if user is paid premium
  const status = getPremiumStatus(userProfile);
  if (status.isPremium && status.reason === 'paid') return false;

  // Dedup via AsyncStorage
  const key = `active_day_token_granted_${activeDayCount}`;
  const alreadyGranted = await AsyncStorage.getItem(key);
  if (alreadyGranted) return false;

  await AsyncStorage.setItem(key, 'true');
  return true;
};

/**
 * Check if user can redeem a trial token.
 * Returns { expiry: Date, trialType: 'active_day' } | null.
 */
export const redeemTrialToken = (userProfile) => {
  if (!userProfile || (userProfile.trialTokens || 0) <= 0) return null;

  // Don't redeem if user already has active premium
  const status = getPremiumStatus(userProfile);
  if (status.isPremium) return null;

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 3);
  return { expiry, trialType: 'active_day' };
};

// ── Friend gift token eligibility ──

/**
 * Check if the user's first 13-day streak should earn a friend gift token.
 * Triggers at streak === 13, once per account (friendTokenEarned flag).
 *
 * Returns true if a friend token should be awarded, false otherwise.
 */
export const checkFriendTokenEligibility = async (streak, userProfile) => {
  if (streak !== 13) return false;

  // One-time only: check Firestore flag
  if (userProfile?.friendTokenEarned) return false;

  // Also check AsyncStorage as a local dedup
  const alreadyEarned = await AsyncStorage.getItem('friend_token_earned');
  if (alreadyEarned) return false;

  // Mark locally
  await AsyncStorage.setItem('friend_token_earned', 'true');

  return true;
};

// ── Display helpers ──

/** Human-readable premium status label. */
export const getPremiumLabel = (userProfile) => {
  const status = getPremiumStatus(userProfile);
  if (!status.isPremium) return 'Free';
  switch (status.reason) {
    case 'paid':
      return 'Premium';
    case 'new_user_trial':
      return `Welcome Trial (${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left)`;
    case 'streak_13_trial':
      return `Streak Trial (${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left)`;
    case 'active_day_trial':
      return `Token Trial (${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left)`;
    case 'streak_trial':
      return `Premium Trial (${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left)`;
    case 'limited_trial':
      return `Limited Trial (${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left)`;
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
    case 'new_user_trial':
      return `Welcome trial — ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} remaining`;
    case 'streak_13_trial':
    case 'active_day_trial':
    case 'streak_trial': {
      if (userProfile.premiumTrialExpiry) {
        const trialExpiry =
          userProfile.premiumTrialExpiry?.toDate?.() ??
          (userProfile.premiumTrialExpiry?.seconds
            ? new Date(userProfile.premiumTrialExpiry.seconds * 1000)
            : new Date(userProfile.premiumTrialExpiry));
        const typeLabel = status.reason === 'streak_13_trial' ? 'Streak trial' :
                         status.reason === 'active_day_trial' ? 'Token trial' : 'Premium trial';
        return `${typeLabel} until ${trialExpiry.toLocaleDateString()}`;
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

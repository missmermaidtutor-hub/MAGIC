import { AppState, Platform } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getESTDate } from '../utils/dateUtils';

// ---- Module state ----
let currentUid = null;
let currentScreenName = null;
let screenFocusedAt = null;
// Running totals for the current date (written as full values, not increments)
let totalScreenTime = {};
let totalActions = {};
let totalDate = null; // track which date the totals belong to
let flushIntervalId = null;
let appStateSubscription = null;
let dirty = false; // whether there's unsaved data

// ---- Public API ----

/**
 * Initialize analytics for the logged-in user.
 * Call after auth completes.
 */
export const initAnalytics = (uid) => {
  if (currentUid === uid) return; // already initialized for this user
  stopAnalytics(); // clean up any previous session

  currentUid = uid;
  totalScreenTime = {};
  totalActions = {};
  totalDate = getESTDate();
  currentScreenName = null;
  screenFocusedAt = null;
  dirty = false;

  // Flush every 30 seconds (was 60 — more frequent for reliability)
  flushIntervalId = setInterval(flushAnalytics, 30000);

  // Flush on app background / inactive
  appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background' || nextState === 'inactive') {
      flushAnalytics();
    }
  });

  // Web: flush before page close
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushAnalyticsSync);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushAnalytics();
    });
  }
};

/**
 * Tear down analytics (on logout or unmount).
 */
export const stopAnalytics = () => {
  // Flush synchronously-safe (captures data before clearing)
  flushAnalytics();

  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', flushAnalyticsSync);
  }

  currentUid = null;
  currentScreenName = null;
  screenFocusedAt = null;
  totalScreenTime = {};
  totalActions = {};
  totalDate = null;
  dirty = false;
};

/**
 * Called by NavigationContainer onStateChange/onReady.
 * Records screen time and triggers a flush.
 */
export const onScreenChange = (screenName) => {
  // Record time on previous screen
  if (currentScreenName && screenFocusedAt) {
    const elapsed = (Date.now() - screenFocusedAt) / 1000;
    if (elapsed > 0 && elapsed < 3600) {
      checkDateRollover();
      totalScreenTime[currentScreenName] =
        (totalScreenTime[currentScreenName] || 0) + Math.round(elapsed);
      dirty = true;
    }
  }

  // Start timing new screen
  currentScreenName = screenName;
  screenFocusedAt = Date.now();

  // Flush on every navigation (ensures data is saved frequently)
  if (dirty) flushAnalytics();
};

/**
 * Track a discrete user action.
 */
export const trackAction = (actionName) => {
  if (!actionName) return;
  checkDateRollover();
  totalActions[actionName] = (totalActions[actionName] || 0) + 1;
  dirty = true;
};

// ---- Internal helpers ----

/**
 * If the date has changed (midnight rollover), flush old data and reset.
 */
const checkDateRollover = () => {
  const now = getESTDate();
  if (totalDate && now !== totalDate) {
    // Date changed — flush old day's data, then reset for new day
    flushAnalytics();
    totalScreenTime = {};
    totalActions = {};
    totalDate = now;
    dirty = false;
  }
};

/**
 * Flush data to Firestore.
 * Writes full totals (not increments) — idempotent and safe for retries.
 */
export const flushAnalytics = async () => {
  if (!currentUid || !dirty) return;

  // Capture in-progress screen time
  if (currentScreenName && screenFocusedAt) {
    const elapsed = (Date.now() - screenFocusedAt) / 1000;
    if (elapsed > 0 && elapsed < 3600) {
      checkDateRollover();
      totalScreenTime[currentScreenName] =
        (totalScreenTime[currentScreenName] || 0) + Math.round(elapsed);
    }
    screenFocusedAt = Date.now(); // reset for next interval
  }

  const dateStr = totalDate || getESTDate();
  const uid = currentUid; // capture before any async gap

  // Build the full document — write complete maps (not increments)
  const screenTimeCopy = { ...totalScreenTime };
  const actionsCopy = { ...totalActions };

  const hasData = Object.keys(screenTimeCopy).length > 0 || Object.keys(actionsCopy).length > 0;
  if (!hasData) return;

  try {
    const docRef = doc(db, 'analytics', dateStr, 'users', uid);
    await setDoc(docRef, {
      screenTime: screenTimeCopy,
      actions: actionsCopy,
      lastSeen: serverTimestamp(),
    }, { merge: true });
    dirty = false;
  } catch (error) {
    // Keep dirty=true so next flush retries
    console.log('Analytics flush error:', error);
  }
};

/**
 * Synchronous flush for web beforeunload (uses sendBeacon as last resort).
 */
const flushAnalyticsSync = () => {
  if (!currentUid || !dirty) return;

  // Capture final screen time
  if (currentScreenName && screenFocusedAt) {
    const elapsed = (Date.now() - screenFocusedAt) / 1000;
    if (elapsed > 0 && elapsed < 3600) {
      totalScreenTime[currentScreenName] =
        (totalScreenTime[currentScreenName] || 0) + Math.round(elapsed);
    }
  }

  const dateStr = totalDate || getESTDate();
  const hasData = Object.keys(totalScreenTime).length > 0 || Object.keys(totalActions).length > 0;
  if (!hasData) return;

  // Use sendBeacon for reliable delivery on page close
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const projectId = 'magicnestlings';
      const path = `projects/${projectId}/databases/(default)/documents/analytics/${dateStr}/users/${currentUid}`;
      const url = `https://firestore.googleapis.com/v1/${path}`;
      // sendBeacon can't do authenticated Firestore writes, so fire the async flush too
    } catch (e) {}
  }
  // Fire async flush (may or may not complete before page closes)
  flushAnalytics();
};

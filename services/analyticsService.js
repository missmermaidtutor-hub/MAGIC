import { AppState } from 'react-native';
import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getESTDate } from '../utils/dateUtils';

// ---- Module state ----
let currentUid = null;
let currentScreenName = null;
let screenFocusedAt = null;
let pendingScreenTime = {};
let pendingActions = {};
let flushIntervalId = null;
let appStateSubscription = null;

// ---- Public API ----

/**
 * Initialize analytics for the logged-in user.
 * Call after auth completes.
 */
export const initAnalytics = (uid) => {
  if (currentUid === uid) return; // already initialized for this user
  stopAnalytics(); // clean up any previous session

  currentUid = uid;
  pendingScreenTime = {};
  pendingActions = {};
  currentScreenName = null;
  screenFocusedAt = null;

  // Flush every 60 seconds
  flushIntervalId = setInterval(flushAnalytics, 60000);

  // Flush on app background
  appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background' || nextState === 'inactive') {
      flushAnalytics();
    }
  });
};

/**
 * Tear down analytics (on logout or unmount).
 */
export const stopAnalytics = () => {
  flushAnalytics();

  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  currentUid = null;
  currentScreenName = null;
  screenFocusedAt = null;
  pendingScreenTime = {};
  pendingActions = {};
};

/**
 * Called by NavigationContainer onStateChange/onReady.
 * Automatically records screen time for the previous screen.
 */
export const onScreenChange = (screenName) => {
  // Record time on previous screen
  if (currentScreenName && screenFocusedAt) {
    const elapsed = (Date.now() - screenFocusedAt) / 1000;
    if (elapsed > 0 && elapsed < 3600) { // cap at 1 hour to filter outliers
      pendingScreenTime[currentScreenName] =
        (pendingScreenTime[currentScreenName] || 0) + elapsed;
    }
  }

  // Start timing new screen
  currentScreenName = screenName;
  screenFocusedAt = Date.now();
};

/**
 * Track a discrete user action.
 * Example: trackAction('courage_uploaded_write')
 */
export const trackAction = (actionName) => {
  if (!actionName) return;
  pendingActions[actionName] = (pendingActions[actionName] || 0) + 1;
};

/**
 * Flush pending data to Firestore.
 * Uses increment() so multiple flushes merge correctly.
 */
export const flushAnalytics = async () => {
  if (!currentUid) return;

  // Capture in-progress screen time
  if (currentScreenName && screenFocusedAt) {
    const elapsed = (Date.now() - screenFocusedAt) / 1000;
    if (elapsed > 0 && elapsed < 3600) {
      pendingScreenTime[currentScreenName] =
        (pendingScreenTime[currentScreenName] || 0) + elapsed;
    }
    screenFocusedAt = Date.now(); // reset for next interval
  }

  // Snapshot and clear pending data
  const screenTimeSnapshot = { ...pendingScreenTime };
  const actionsSnapshot = { ...pendingActions };
  pendingScreenTime = {};
  pendingActions = {};

  // Nothing to write?
  const hasScreenTime = Object.keys(screenTimeSnapshot).length > 0;
  const hasActions = Object.keys(actionsSnapshot).length > 0;
  if (!hasScreenTime && !hasActions) return;

  try {
    const dateStr = getESTDate();
    const docRef = doc(db, 'analytics', dateStr, 'users', currentUid);

    // Build update object with dot-notation for nested fields
    const updates = {
      lastSeen: serverTimestamp(),
    };

    for (const [screen, seconds] of Object.entries(screenTimeSnapshot)) {
      const rounded = Math.round(seconds);
      if (rounded > 0) {
        updates[`screenTime.${screen}`] = increment(rounded);
      }
    }

    for (const [action, count] of Object.entries(actionsSnapshot)) {
      if (count > 0) {
        updates[`actions.${action}`] = increment(count);
      }
    }

    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    // On failure, merge data back so it retries next flush
    for (const [screen, seconds] of Object.entries(screenTimeSnapshot)) {
      pendingScreenTime[screen] = (pendingScreenTime[screen] || 0) + seconds;
    }
    for (const [action, count] of Object.entries(actionsSnapshot)) {
      pendingActions[action] = (pendingActions[action] || 0) + count;
    }
    console.log('Analytics flush error:', error);
  }
};

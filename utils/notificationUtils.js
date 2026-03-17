import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// ============================================================
// STREAK REMINDER MESSAGES (rotating daily)
// ============================================================

const STREAK_MESSAGES = [
  "Your MAGIC streak is on fire! Don't let it cool down.",
  "A few minutes of creativity keeps the streak alive!",
  "Your future self will thank you for showing up today.",
  "Even 5 minutes of art or journaling counts. You've got this!",
  "Consistency beats perfection. Keep your streak going!",
  "The muse rewards those who show up. Open your MAGIC app today.",
  "Your creative practice is a gift to yourself. Unwrap it today!",
  "One small step today keeps your streak strong for tomorrow.",
  "Don't break the chain! Your streak is waiting for you.",
  "Inspiration strikes those who are present. Check in with MAGIC today.",
  "You've built something beautiful with your streak. Keep building!",
  "Creativity is a muscle. Give it a quick workout today!",
];

// Pick a deterministic message based on date (rotates through all 12)
const getMessageForDate = (date = new Date()) => {
  const dayOfYear = Math.floor(
    (date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  );
  return STREAK_MESSAGES[dayOfYear % STREAK_MESSAGES.length];
};

// ============================================================
// PERMISSIONS
// ============================================================

export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.log('Notification permission error:', e);
    return false;
  }
};

// ============================================================
// NOTIFICATION CHANNEL (Android)
// ============================================================

export const setupNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('streak-reminders', {
      name: 'Streak Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
};

// ============================================================
// SCHEDULING
// ============================================================

// Calculate next 7 PM in the user's timezone as a Date object
const getNext7PM = (timezoneStr, forTomorrow = false) => {
  const now = new Date();

  // Get current time in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezoneStr,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type) => parseInt(parts.find(p => p.type === type)?.value || '0');

  const userHour = get('hour');

  // If it's already past 7 PM in user's timezone, or forTomorrow is true, schedule for tomorrow
  const daysToAdd = (userHour >= 19 || forTomorrow) ? 1 : 0;

  // Build the target date: today (or tomorrow) at 19:00 in user's timezone
  // We do this by creating a date string and letting the timezone offset resolve
  const userYear = get('year');
  const userMonth = get('month');
  const userDay = get('day');

  // Target date in user's local calendar
  const targetDay = new Date(userYear, userMonth - 1, userDay + daysToAdd);
  const targetStr = `${targetDay.getFullYear()}-${String(targetDay.getMonth() + 1).padStart(2, '0')}-${String(targetDay.getDate()).padStart(2, '0')}T19:00:00`;

  // Convert from user's timezone to UTC by finding the offset
  const targetInTZ = new Date(targetStr);
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezoneStr,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  // Find the UTC offset by comparing local interpretation to timezone interpretation
  const localParts = utcFormatter.formatToParts(targetInTZ);
  const getP = (type) => parseInt(localParts.find(p => p.type === type)?.value || '0');
  const tzHour = getP('hour');

  // The difference between targetInTZ's local hour and the timezone hour gives us the offset
  const localHour = targetInTZ.getHours();
  let offsetHours = localHour - tzHour;
  // Normalize wrapping
  if (offsetHours > 12) offsetHours -= 24;
  if (offsetHours < -12) offsetHours += 24;

  // Adjust to get UTC time that equals 7 PM in user's timezone
  const utcTarget = new Date(targetInTZ.getTime() + offsetHours * 60 * 60 * 1000);

  // If the calculated time is in the past, push to tomorrow
  if (utcTarget <= now) {
    return getNext7PM(timezoneStr, true);
  }

  return utcTarget;
};

// Get next Sunday at 7 PM in the user's timezone
const getNextSunday7PM = (timezoneStr) => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezoneStr,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value;

  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const currentDay = dayMap[weekday] ?? 0;
  const daysUntilSunday = currentDay === 0 ? 7 : 7 - currentDay; // always next Sunday

  const target = getNext7PM(timezoneStr);
  target.setDate(target.getDate() + daysUntilSunday - (target <= now ? 0 : 0));

  // Simpler: just add days to get to next Sunday from next7PM
  const next7pm = getNext7PM(timezoneStr);
  const next7pmFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezoneStr,
    weekday: 'short',
  });
  const next7pmDay = next7pmFormatter.format(next7pm);
  const next7pmDayNum = dayMap[next7pmDay] ?? 0;

  if (next7pmDayNum === 0) return next7pm; // already Sunday

  const daysToSunday = 7 - next7pmDayNum;
  return new Date(next7pm.getTime() + daysToSunday * 24 * 60 * 60 * 1000);
};

/**
 * Schedule a streak reminder notification.
 *
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @param {string} preference - 'daily' | 'weekly' | 'none'
 * @param {boolean} forTomorrow - Force scheduling for tomorrow (used after user interaction)
 */
export const scheduleStreakReminder = async (timezone = 'America/New_York', preference = 'daily', forTomorrow = false) => {
  if (Platform.OS === 'web') return;

  try {
    // Always cancel existing reminders first
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (preference === 'none') return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    // Calculate fire time
    let fireDate;
    if (preference === 'weekly') {
      fireDate = getNextSunday7PM(timezone);
    } else {
      fireDate = getNext7PM(timezone, forTomorrow);
    }

    const message = getMessageForDate(fireDate);
    const secondsUntilFire = Math.max(1, Math.round((fireDate.getTime() - Date.now()) / 1000));

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'MAGIC Reminder',
        body: message,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilFire,
        repeats: false,
      },
    });
  } catch (e) {
    console.log('Schedule notification error:', e);
  }
};

/**
 * Cancel all pending streak reminders.
 */
export const cancelAllReminders = async () => {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.log('Cancel notifications error:', e);
  }
};

/**
 * Configure how notifications appear when app is in foreground.
 */
export const configureNotificationHandler = () => {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
};

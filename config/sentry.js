import * as Sentry from '@sentry/react-native';

// Replace with your actual Sentry DSN from https://sentry.io
const SENTRY_DSN = 'YOUR_SENTRY_DSN_HERE';

const isConfigured = SENTRY_DSN !== 'YOUR_SENTRY_DSN_HERE';

export const initSentry = () => {
  if (!isConfigured) {
    console.log('Sentry DSN not configured — skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    enabled: !__DEV__,
    attachStacktrace: true,
  });
};

export const setSentryUser = (uid, email) => {
  if (!isConfigured) return;
  Sentry.setUser({ id: uid, email: email || undefined });
};

export const clearSentryUser = () => {
  if (!isConfigured) return;
  Sentry.setUser(null);
};

export const captureError = (error, context = {}) => {
  console.log('Error:', error, context);
  if (!isConfigured) return;
  Sentry.captureException(error, { extra: context });
};

export { Sentry };

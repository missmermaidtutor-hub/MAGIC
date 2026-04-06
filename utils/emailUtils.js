import { Platform, Linking } from 'react-native';

/**
 * Open Gmail compose reliably on all platforms.
 *
 * On web: uses Gmail's direct compose URL (mail.google.com/?view=cm) opened in a new tab.
 * This bypasses the mailto: handler entirely, avoiding two common failure modes:
 *   1. Chrome's mailto: handler sometimes drops the body parameter silently.
 *   2. The mailto: URL length limit (~2000 chars) can truncate long Firebase Storage URLs.
 * Gmail's compose URL has no length restriction and reliably pre-fills subject + body.
 *
 * Falls back to hidden anchor mailto: click if the user's browser blocks window.open (rare).
 */
export const openMailto = (subject, body, to = '') => {
  if (Platform.OS === 'web') {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const toParam = to ? `&to=${encodeURIComponent(to)}` : '';
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1${toParam}&su=${encodedSubject}&body=${encodedBody}`;

    // window.open in a new tab — doesn't navigate the app away
    const newTab = window.open(gmailUrl, '_blank');
    if (!newTab) {
      // Popup blocked: fall back to mailto: anchor click
      const mailtoUrl = `mailto:${to ? encodeURIComponent(to) : ''}?subject=${encodedSubject}&body=${encodedBody}`;
      const a = document.createElement('a');
      a.href = mailtoUrl;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 200);
    }
  } else {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    Linking.openURL(`mailto:${to || ''}?subject=${encodedSubject}&body=${encodedBody}`);
  }
};

import { Platform, Linking } from 'react-native';

/**
 * Open a mailto: link reliably on all platforms.
 * On web, Linking.openURL uses window.open() which gets blocked by popup blockers.
 * Using window.location.href for mailto: links works reliably without triggering blockers.
 */
export const openMailto = (subject, body, to = '') => {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const recipient = to ? encodeURIComponent(to) : '';
  const url = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;

  if (Platform.OS === 'web') {
    window.location.href = url;
  } else {
    Linking.openURL(url);
  }
};

import { Alert, Platform } from 'react-native';

// Platform-aware alert helpers
// Alert.alert is an empty no-op in react-native-web 0.19.13
// These wrappers use window.alert/window.confirm on web

export const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

export const showConfirm = (title, message, onConfirm, confirmText = 'OK') => {
  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmText, onPress: onConfirm },
    ]);
  }
};

export const showDestructiveConfirm = (title, message, onConfirm, confirmText = 'Delete') => {
  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmText, style: 'destructive', onPress: onConfirm },
    ]);
  }
};

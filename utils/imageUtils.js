import { Platform } from 'react-native';

/**
 * On web, ImagePicker returns blob: URLs that expire on page reload.
 * Convert to base64 data: URLs for persistence in AsyncStorage.
 * On native, file:// URIs persist — return as-is.
 */
export const persistImageUri = async (uri) => {
  if (Platform.OS !== 'web' || !uri || !uri.startsWith('blob:')) {
    return uri;
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.log('Failed to convert blob to data URL:', e);
    return uri;
  }
};

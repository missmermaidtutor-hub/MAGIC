import { Platform } from 'react-native';
import { uploadMediaToStorage } from '../services/firestoreService';

/**
 * Persist an image URI for storage in AsyncStorage.
 *
 * Web: ImagePicker returns blob: URLs that expire on page reload.
 * If uid is provided, uploads to Firebase Storage and returns the
 * download URL (small string, no localStorage bloat).
 * Falls back to base64 data URL if upload fails.
 *
 * Native: file:// URIs persist — returned as-is.
 */
export const persistImageUri = async (uri, uid) => {
  if (Platform.OS !== 'web' || !uri) return uri;

  // Already persistent (data URL or Firebase download URL)
  if (uri.startsWith('data:') || uri.startsWith('https://')) return uri;

  // Not a blob — nothing to convert
  if (!uri.startsWith('blob:')) return uri;

  // Try Firebase Storage upload first (returns a short URL, saves localStorage space)
  if (uid) {
    try {
      const path = `artworks/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
      const downloadUrl = await uploadMediaToStorage(uri, path);
      return downloadUrl;
    } catch (e) {
      console.log('Firebase Storage upload failed, falling back to base64:', e);
    }
  }

  // Fallback: convert blob to base64 data URL
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

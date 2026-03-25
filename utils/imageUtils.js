import { Platform } from 'react-native';
import { uploadMediaToStorage } from '../services/firestoreService';

/**
 * Persist an image URI by uploading to Firebase Storage.
 *
 * ALL images (data:, blob:, file://) are uploaded to Storage when uid is provided,
 * returning a short https:// download URL. This keeps AsyncStorage lean
 * (URLs are ~200 bytes vs ~1MB for base64 data URIs) and ensures images
 * are accessible across devices and galleries.
 *
 * Falls back to base64 data URL only if Storage upload fails on web.
 * Native file:// URIs are returned as-is if no uid provided.
 */
export const persistImageUri = async (uri, uid, artworkId) => {
  if (!uri) return uri;

  // Already a Firebase Storage URL — nothing to do
  if (uri.startsWith('https://')) return uri;

  // Upload to Firebase Storage if uid is available
  // Use artworkId for consistent path (same image = same path = no duplicates)
  if (uid) {
    try {
      const fileName = artworkId
        ? `${artworkId}.png`
        : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
      const path = `artworks/${uid}/${fileName}`;
      const downloadUrl = await uploadMediaToStorage(uri, path);
      return downloadUrl;
    } catch (e) {
      console.log('Firebase Storage upload failed:', e);
      // Fall through to fallbacks below
    }
  }

  // Native: file:// URIs persist locally — return as-is
  if (Platform.OS !== 'web') return uri;

  // Web fallback: convert blob to base64 data URL (if Storage upload failed)
  if (uri.startsWith('blob:')) {
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
    }
  }

  // Last resort: return as-is
  return uri;
};

/**
 * Lazy-migrate existing gallery items from data:/blob: URIs to Firebase Storage URLs.
 * Scans an array of artworks, uploads any non-https images, and returns
 * { migrated: updatedArray, changed: boolean } so the caller can save back.
 * Runs in the background — non-blocking, best-effort.
 */
export const migrateGalleryImages = async (artworks, uid) => {
  if (!uid || !artworks || artworks.length === 0) return { migrated: artworks, changed: false };

  let changed = false;
  const migrated = await Promise.all(
    artworks.map(async (artwork) => {
      const url = artwork.imageUrl;
      if (!url || url.startsWith('https://')) return artwork; // already migrated or no image

      try {
        const path = `artworks/${uid}/${artwork.id || Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
        const downloadUrl = await uploadMediaToStorage(url, path);
        changed = true;
        return { ...artwork, imageUrl: downloadUrl };
      } catch (e) {
        // Skip this one — will try again next load
        return artwork;
      }
    })
  );

  return { migrated, changed };
};

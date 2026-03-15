import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import {
  getUserProfile,
  createUserProfile,
  getGoalHistory,
  getUserArtworks,
  getUserInspirations,
  getUserCurated,
  getManifest,
  getProgress,
  getArtTime,
} from '../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase isn't configured, skip auth entirely and let the app run
    if (!isFirebaseConfigured) {
      setLoading(false);
      // Set a fake user so the app shows the main tabs instead of login
      setUser({ uid: 'local', email: '' });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Try Firestore first
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setUserProfile(profile);
            // Cache in AsyncStorage for offline access
            await AsyncStorage.setItem('cached_user_profile', JSON.stringify(profile));
            // Trigger non-blocking background sync
            backgroundSync(firebaseUser.uid);
          } else {
            // Auto-create profile for signed-in users who don't have one
            try {
              await createUserProfile(firebaseUser.uid, {
                email: firebaseUser.email || '',
                accountMethod: firebaseUser.providerData?.[0]?.providerId === 'google.com' ? 'google'
                  : firebaseUser.providerData?.[0]?.providerId === 'apple.com' ? 'apple'
                  : 'email',
                pseudonym: firebaseUser.displayName || '',
              });
              const newProfile = await getUserProfile(firebaseUser.uid);
              if (newProfile) {
                setUserProfile(newProfile);
                await AsyncStorage.setItem('cached_user_profile', JSON.stringify(newProfile));
              }
            } catch (createError) {
              console.log('Error creating profile:', createError);
              // Fallback to cached profile
              const cached = await AsyncStorage.getItem('cached_user_profile');
              if (cached) setUserProfile(JSON.parse(cached));
            }
          }
        } catch (error) {
          console.log('Error loading profile, using cache:', error);
          // Offline fallback
          const cached = await AsyncStorage.getItem('cached_user_profile');
          if (cached) setUserProfile(JSON.parse(cached));
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Background sync: pull Firestore data into AsyncStorage (non-blocking)
  const backgroundSync = async (uid) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Sync artworks
      const [artworks, inspirations, curated] = await Promise.all([
        getUserArtworks(uid).catch(() => null),
        getUserInspirations(uid).catch(() => null),
        getUserCurated(uid).catch(() => null),
      ]);

      if (artworks && artworks.length > 0) {
        const localRaw = await AsyncStorage.getItem('personal_artworks');
        const local = localRaw ? JSON.parse(localRaw) : [];
        if (artworks.length > local.length) {
          await AsyncStorage.setItem('personal_artworks', JSON.stringify(artworks));
        }
      }

      if (inspirations && inspirations.length > 0) {
        const localRaw = await AsyncStorage.getItem('favorite_artworks');
        const local = localRaw ? JSON.parse(localRaw) : [];
        if (inspirations.length > local.length) {
          await AsyncStorage.setItem('favorite_artworks', JSON.stringify(inspirations));
        }
      }

      if (curated && curated.length > 0) {
        const localRaw = await AsyncStorage.getItem('public_artworks');
        const local = localRaw ? JSON.parse(localRaw) : [];
        if (curated.length > local.length) {
          await AsyncStorage.setItem('public_artworks', JSON.stringify(curated));
        }
      }

      // Sync today's manifest
      const manifest = await getManifest(uid, today).catch(() => null);
      if (manifest) {
        const localManifest = await AsyncStorage.getItem(`manifest_${today}`);
        if (!localManifest) {
          await AsyncStorage.setItem(`manifest_${today}`, JSON.stringify(manifest));
        }
      }

      // Sync today's progress
      const progress = await getProgress(uid, today).catch(() => null);
      if (progress) {
        // Progress is used for streak tracking — store as-is
        await AsyncStorage.setItem(`progress_${today}`, JSON.stringify(progress));
      }

      // Sync today's art time
      const artTime = await getArtTime(uid, today).catch(() => null);
      if (artTime?.seconds) {
        const localTime = await AsyncStorage.getItem(`art_time_${today}`);
        const localSeconds = localTime ? parseInt(localTime) : 0;
        if (artTime.seconds > localSeconds) {
          await AsyncStorage.setItem(`art_time_${today}`, String(artTime.seconds));
        }
      }

      console.log('Background sync complete');
    } catch (error) {
      console.log('Background sync error (non-critical):', error);
    }
  };

  const signOut = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      await AsyncStorage.removeItem('cached_user_profile');
    } catch (error) {
      console.log('Sign out error:', error);
    }
  };

  const refreshProfile = async () => {
    if (!isFirebaseConfigured || !user) return;
    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setUserProfile(profile);
        await AsyncStorage.setItem('cached_user_profile', JSON.stringify(profile));
      }
    } catch (error) {
      console.log('Error refreshing profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut, refreshProfile, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

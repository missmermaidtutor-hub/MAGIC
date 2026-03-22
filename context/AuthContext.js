import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, sendEmailVerification } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { setSentryUser, clearSentryUser, captureError } from '../config/sentry';
import {
  getUserProfile,
  createUserProfile,
  grantPremiumTrial,
  getGoalHistory,
  getUserArtworks,
  getUserInspirations,
  getUserCurated,
  getManifest,
  getProgress,
  getArtTime,
} from '../services/firestoreService';
import { getPremiumStatus, checkStreakTrialEligibility } from '../utils/premiumUtils';
import { trackAction } from '../services/analyticsService';
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
        setSentryUser(firebaseUser.uid, firebaseUser.email);
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
            // No profile yet — user needs to complete signup flow
            // Don't auto-create; SignUpScreen will create the full profile
            console.log('No profile found for user:', firebaseUser.uid, '— awaiting signup completion');
          }
        } catch (error) {
          console.log('Error loading profile, using cache:', error);
          captureError(error, { context: 'loadProfile' });
          // Offline fallback
          const cached = await AsyncStorage.getItem('cached_user_profile');
          if (cached) setUserProfile(JSON.parse(cached));
        }
      } else {
        setUserProfile(null);
        clearSentryUser();
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

  // Check if current streak qualifies for a premium trial grant
  const checkStreakTrial = async (streak) => {
    if (!user || user.uid === 'local' || !userProfile) return;
    try {
      const expiry = await checkStreakTrialEligibility(streak, userProfile);
      if (expiry) {
        await grantPremiumTrial(user.uid, expiry);
        trackAction('premium_trial_granted');
        // Update local profile so UI reflects immediately
        const updatedProfile = { ...userProfile, premiumTrialExpiry: expiry };
        setUserProfile(updatedProfile);
        await AsyncStorage.setItem('cached_user_profile', JSON.stringify(updatedProfile));
        return true; // trial was granted
      }
    } catch (error) {
      console.log('Error checking streak trial:', error);
    }
    return false;
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

  const resendVerification = async () => {
    if (!auth.currentUser) {
      console.log('Resend verification: no current user');
      return false;
    }
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (error) {
      console.log('Resend verification error:', error.code, error.message);
      return false;
    }
  };

  const checkEmailVerified = async () => {
    if (!auth.currentUser || auth.currentUser.emailVerified) return;
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        // Update the user object in state so banner disappears
        setUser({ ...auth.currentUser });
      }
    } catch (error) {
      console.log('Email verification check error:', error);
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
    <AuthContext.Provider value={{ user, userProfile, loading, signOut, refreshProfile, resendVerification, checkEmailVerified, checkStreakTrial, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

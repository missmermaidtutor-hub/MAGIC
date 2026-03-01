import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getUserProfile } from '../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          } else {
            // Fallback to cached profile
            const cached = await AsyncStorage.getItem('cached_user_profile');
            if (cached) setUserProfile(JSON.parse(cached));
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

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      await AsyncStorage.removeItem('cached_user_profile');
    } catch (error) {
      console.log('Sign out error:', error);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
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
    <AuthContext.Provider value={{ user, userProfile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

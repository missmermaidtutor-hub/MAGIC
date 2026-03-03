import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCBZkuUSS2jCj2F5YsS0PjRGlhFiI5MB-I',
  authDomain: 'magicnestlings.firebaseapp.com',
  projectId: 'magicnestlings',
  storageBucket: 'magicnestlings.firebasestorage.app',
  messagingSenderId: '220647543282',
  appId: '1:220647543282:web:74bbacfddb4cb7df42db6b',
  measurementId: 'G-B65RWLXQK9',
};

export const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';

const app = initializeApp(firebaseConfig);

// Use platform-appropriate auth persistence
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);

export { auth, db };

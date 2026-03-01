import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Create a new user profile in Firestore
export const createUserProfile = async (uid, data) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email: data.email || '',
    accountMethod: data.accountMethod || 'email',
    pseudonym: data.pseudonym || '',
    birthdate: data.birthdate || '',
    timezone: data.timezone || 'America/New_York',
    currentLocation: data.currentLocation || { country: '', state: '', city: '' },
    heartLocation: data.heartLocation || { country: '', state: '', city: '' },
    favoriteMediums: data.favoriteMediums || [],
    notificationPreference: data.notificationPreference || 'daily',
    allowWorkBoutique: data.allowWorkBoutique ?? false,
    anonymous: data.anonymous ?? true,
    bio: data.bio || '',
    favoritePrompt: data.favoritePrompt || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// Get user profile from Firestore
export const getUserProfile = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
};

// Update specific fields on user profile
export const updateUserProfile = async (uid, updates) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Check if a pseudonym is available
export const checkPseudonymAvailable = async (pseudonym) => {
  const key = pseudonym.toLowerCase().trim();
  if (!key) return false;
  const pseudonymRef = doc(db, 'pseudonyms', key);
  const snap = await getDoc(pseudonymRef);
  if (!snap.exists()) return true;
  const data = snap.data();
  return data.released === true;
};

// Claim a pseudonym atomically using a transaction
export const claimPseudonym = async (pseudonym, uid) => {
  const key = pseudonym.toLowerCase().trim();
  if (!key) throw new Error('Pseudonym cannot be empty');

  const pseudonymRef = doc(db, 'pseudonyms', key);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(pseudonymRef);

    if (snap.exists()) {
      const data = snap.data();
      if (!data.released) {
        // Already claimed by someone
        if (data.uid === uid) return; // Same user already owns it
        throw new Error('This pseudonym is already taken');
      }
    }

    // Claim it
    transaction.set(pseudonymRef, {
      pseudonym: pseudonym.trim(),
      uid,
      claimedAt: serverTimestamp(),
      released: false,
    });
  });
};

// Release a pseudonym (mark as released, never delete)
export const releasePseudonym = async (pseudonym) => {
  const key = pseudonym.toLowerCase().trim();
  if (!key) return;
  const pseudonymRef = doc(db, 'pseudonyms', key);
  const snap = await getDoc(pseudonymRef);
  if (snap.exists()) {
    await updateDoc(pseudonymRef, { released: true });
  }
};

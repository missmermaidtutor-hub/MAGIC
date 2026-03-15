import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  writeBatch,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

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

// ============================================================
// DAILY COURAGES
// ============================================================

// Upload media (image/audio) to Firebase Storage, return download URL
export const uploadMediaToStorage = async (uri, path) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
};

// Check if user already uploaded a courage today
export const getUserCourageForDate = async (uid, dateStr) => {
  const q = query(
    collection(db, 'dailyCourages'),
    where('uid', '==', uid),
    where('date', '==', dateStr),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

// Upload a new courage
export const uploadCourage = async (uid, data) => {
  const docRef = await addDoc(collection(db, 'dailyCourages'), {
    uid,
    pseudonym: data.pseudonym || '',
    title: data.title || '',
    mediaType: data.mediaType || 'image',
    mediaUrl: data.mediaUrl || '',
    date: data.date,
    anonymous: data.anonymous ?? false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// Get all courages for a specific date (for voting)
export const getCouragesForDate = async (dateStr) => {
  const q = query(
    collection(db, 'dailyCourages'),
    where('date', '==', dateStr),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ============================================================
// VOTES
// ============================================================

// Get all votes this user has cast for courages from a given date
export const getUserVotesForDate = async (voterUid, courageDate) => {
  const q = query(
    collection(db, 'votes'),
    where('voterUid', '==', voterUid),
    where('courageDate', '==', courageDate),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Submit a batch of 4 votes atomically
export const submitVoteBatch = async (voterUid, votes) => {
  const batch = writeBatch(db);
  const batchId = `${voterUid}_${Date.now()}`;
  for (const vote of votes) {
    const voteRef = doc(collection(db, 'votes'));
    batch.set(voteRef, {
      voterUid,
      courageId: vote.courageId,
      courageDate: vote.courageDate,
      score: vote.score,
      batchId,
      votedAt: serverTimestamp(),
    });
  }
  await batch.commit();
};

// Get all votes for a specific date's courages (for winner calculation)
export const getAllVotesForDate = async (courageDate) => {
  const q = query(
    collection(db, 'votes'),
    where('courageDate', '==', courageDate),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ============================================================
// DAILY WINNERS
// ============================================================

// Get the winner for a specific date
export const getWinner = async (dateStr) => {
  const winnerRef = doc(db, 'dailyWinners', dateStr);
  const snap = await getDoc(winnerRef);
  if (snap.exists()) return snap.data();
  return null;
};

// Get recent winners (for browsing on home page)
export const getRecentWinners = async (count = 25) => {
  const q = query(
    collection(db, 'dailyWinners'),
    orderBy('date', 'desc'),
    firestoreLimit(count),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
};

// Calculate and set the winner for a date
// Uses a transaction to prevent duplicate writes
export const calculateAndSetWinner = async (dateStr) => {
  const winnerRef = doc(db, 'dailyWinners', dateStr);

  // Check if winner already exists
  const existing = await getDoc(winnerRef);
  if (existing.exists()) return existing.data();

  // Get all courages for that date
  const courages = await getCouragesForDate(dateStr);
  if (courages.length === 0) return null;

  // Get all votes for that date
  const votes = await getAllVotesForDate(dateStr);
  if (votes.length === 0) return null;

  // Calculate average score per courage
  const scoreMap = {}; // courageId -> { total, count }
  for (const vote of votes) {
    if (!scoreMap[vote.courageId]) {
      scoreMap[vote.courageId] = { total: 0, count: 0 };
    }
    scoreMap[vote.courageId].total += vote.score;
    scoreMap[vote.courageId].count += 1;
  }

  // Build scored courages (lower average = better, since 1=best)
  const scoredCourages = courages
    .filter(c => scoreMap[c.id]) // only courages that received votes
    .map(c => ({
      ...c,
      averageScore: scoreMap[c.id].total / scoreMap[c.id].count,
      totalVotes: scoreMap[c.id].count,
    }))
    .sort((a, b) => a.averageScore - b.averageScore); // lowest avg = best

  if (scoredCourages.length === 0) return null;

  // Tiebreak by closest birthday to today
  let winner = scoredCourages[0];
  const tied = scoredCourages.filter(c => c.averageScore === winner.averageScore);
  if (tied.length > 1) {
    const today = new Date();
    const todayMD = (today.getMonth() + 1) * 100 + today.getDate(); // MMDD as number
    let closestDiff = Infinity;
    for (const c of tied) {
      const profile = await getUserProfile(c.uid);
      if (profile?.birthdate) {
        const parts = profile.birthdate.split('/'); // mm/dd/yyyy
        if (parts.length === 3) {
          const bMD = parseInt(parts[0]) * 100 + parseInt(parts[1]);
          const diff = Math.abs(bMD - todayMD);
          const wrappedDiff = Math.min(diff, 1231 - diff); // handle year wrap
          if (wrappedDiff < closestDiff) {
            closestDiff = wrappedDiff;
            winner = c;
          }
        }
      }
    }
  }

  // Write winner (only if not already written)
  const winnerData = {
    date: dateStr,
    courageId: winner.id,
    uid: winner.uid,
    pseudonym: winner.anonymous ? 'Anonymous' : (winner.pseudonym || 'Anonymous'),
    title: winner.title || '',
    mediaType: winner.mediaType || 'image',
    mediaUrl: winner.mediaUrl || '',
    averageScore: winner.averageScore,
    totalVotes: winner.totalVotes,
    calculatedAt: serverTimestamp(),
  };

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(winnerRef);
      if (snap.exists()) return; // already calculated
      transaction.set(winnerRef, winnerData);
    });
  } catch (e) {
    // If transaction fails, winner was likely already written by another client
    const fallback = await getDoc(winnerRef);
    if (fallback.exists()) return fallback.data();
  }

  return winnerData;
};

// ─── Daily Prompt ─────────────────────────────────────────────────
// Fetch today's prompt from Firestore (written externally)
// Document path: dailyPrompts/{dateStr}
// Expected fields: { prompt, encouragement, explained, category }
export const getDailyPrompt = async (dateStr) => {
  const ref = doc(db, 'dailyPrompts', dateStr);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
};

// ============================================================
// USERNAMES
// ============================================================

// Check if a username is available
export const checkUsernameAvailable = async (username) => {
  const key = username.toLowerCase().trim();
  if (!key) return false;
  const usernameRef = doc(db, 'usernames', key);
  const snap = await getDoc(usernameRef);
  if (!snap.exists()) return true;
  const data = snap.data();
  return data.released === true;
};

// Claim a username atomically using a transaction
export const claimUsername = async (username, uid) => {
  const key = username.toLowerCase().trim();
  if (!key) throw new Error('Username cannot be empty');

  const usernameRef = doc(db, 'usernames', key);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(usernameRef);

    if (snap.exists()) {
      const data = snap.data();
      if (!data.released) {
        if (data.uid === uid) return; // Same user already owns it
        throw new Error('This username is already taken');
      }
    }

    transaction.set(usernameRef, {
      username: username.trim(),
      uid,
      claimedAt: serverTimestamp(),
      released: false,
    });
  });
};

// Release a username (mark as released, never delete)
export const releaseUsername = async (username) => {
  const key = username.toLowerCase().trim();
  if (!key) return;
  const usernameRef = doc(db, 'usernames', key);
  const snap = await getDoc(usernameRef);
  if (snap.exists()) {
    await updateDoc(usernameRef, { released: true });
  }
};

// ============================================================
// GOALS
// ============================================================

// Save or update a daily goal
export const saveGoal = async (uid, dateStr, goalData) => {
  const goalRef = doc(db, 'users', uid, 'goals', dateStr);
  await setDoc(goalRef, {
    ...goalData,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// Get goal for a specific date
export const getGoal = async (uid, dateStr) => {
  const goalRef = doc(db, 'users', uid, 'goals', dateStr);
  const snap = await getDoc(goalRef);
  if (snap.exists()) return snap.data();
  return null;
};

// Get recent goal history ordered by date
export const getGoalHistory = async (uid, limit = 30) => {
  const q = query(
    collection(db, 'users', uid, 'goals'),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limit),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ date: d.id, ...d.data() }));
};

// Get goal completion stats
export const getGoalStats = async (uid) => {
  const q = query(collection(db, 'users', uid, 'goals'));
  const snap = await getDocs(q);
  let total = 0;
  let completed = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  const goals = snap.docs.map(d => ({ date: d.id, ...d.data() }));
  goals.sort((a, b) => a.date.localeCompare(b.date));

  for (const goal of goals) {
    total++;
    if (goal.completed) {
      completed++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return {
    total,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    currentStreak,
    longestStreak,
  };
};

// ============================================================
// ARTWORKS (Private Gallery)
// ============================================================

// Save artwork to user's private gallery
export const saveArtwork = async (uid, artwork) => {
  const artRef = await addDoc(collection(db, 'users', uid, 'artworks'), {
    ...artwork,
    createdAt: serverTimestamp(),
  });
  return artRef.id;
};

// Get all artworks for a user
export const getUserArtworks = async (uid) => {
  const q = query(
    collection(db, 'users', uid, 'artworks'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Update artwork fields
export const updateArtwork = async (uid, artworkId, updates) => {
  const artRef = doc(db, 'users', uid, 'artworks', artworkId);
  await updateDoc(artRef, { ...updates, updatedAt: serverTimestamp() });
};

// Delete artwork
export const deleteArtwork = async (uid, artworkId) => {
  const artRef = doc(db, 'users', uid, 'artworks', artworkId);
  await deleteDoc(artRef);
};

// ============================================================
// INSPIRATIONS (Personal Inspiration Gallery)
// ============================================================

// Save an inspiration from voting gallery
export const saveInspiration = async (uid, inspiration) => {
  const ref = await addDoc(collection(db, 'users', uid, 'inspirations'), {
    ...inspiration,
    savedAt: serverTimestamp(),
  });
  return ref.id;
};

// Get all saved inspirations
export const getUserInspirations = async (uid) => {
  const q = query(
    collection(db, 'users', uid, 'inspirations'),
    orderBy('savedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Remove inspiration
export const deleteInspiration = async (uid, inspirationId) => {
  const ref = doc(db, 'users', uid, 'inspirations', inspirationId);
  await deleteDoc(ref);
};

// ============================================================
// CURATED GALLERY (max 25 works)
// ============================================================

// Add to curated gallery (enforces max 25)
export const saveCuratedWork = async (uid, work) => {
  const existing = await getUserCurated(uid);
  if (existing.length >= 25) {
    throw new Error('Curated gallery is full (max 25). Remove a work first.');
  }
  const ref = await addDoc(collection(db, 'users', uid, 'curated'), {
    ...work,
    pseudonym: work.pseudonym || '',
    curatedAt: serverTimestamp(),
  });
  return ref.id;
};

// Get user's curated gallery
export const getUserCurated = async (uid) => {
  const q = query(
    collection(db, 'users', uid, 'curated'),
    orderBy('curatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Remove from curated
export const removeCuratedWork = async (uid, workId) => {
  const ref = doc(db, 'users', uid, 'curated', workId);
  await deleteDoc(ref);
};

// Get all users' curated works for "Visit Community Curations"
export const getAllCuratedGalleries = async () => {
  const q = query(collectionGroup(db, 'curated'));
  const snap = await getDocs(q);
  const works = snap.docs.map(d => {
    const data = d.data();
    // Extract uid from the document path: users/{uid}/curated/{id}
    const pathParts = d.ref.path.split('/');
    return { id: d.id, uid: pathParts[1], ...data };
  });
  return works;
};

// ============================================================
// VOTING GALLERY (Courage → Voting Transfer)
// ============================================================

// Transfer daily courages to voting gallery for a date
export const transferCouragesToVoting = async (dateStr) => {
  // Get all courages for the date
  const courages = await getCouragesForDate(dateStr);
  if (courages.length === 0) return;

  const batch = writeBatch(db);

  // Copy each courage to votingGallery/{date}/entries/{id}
  for (const courage of courages) {
    const entryRef = doc(db, 'votingGallery', dateStr, 'entries', courage.id);
    batch.set(entryRef, {
      ...courage,
      transferredAt: serverTimestamp(),
    });
  }

  await batch.commit();
};

// Get voting gallery entries for a date
export const getVotingGallery = async (dateStr) => {
  const q = query(collection(db, 'votingGallery', dateStr, 'entries'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ============================================================
// MANIFEST (Journal Entries)
// ============================================================

// Save manifest journal entry
export const saveManifest = async (uid, dateStr, data) => {
  const ref = doc(db, 'users', uid, 'manifests', dateStr);
  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// Get manifest for a date
export const getManifest = async (uid, dateStr) => {
  const ref = doc(db, 'users', uid, 'manifests', dateStr);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
};

// ============================================================
// PROGRESS (Daily MAGIC completion)
// ============================================================

// Save daily progress
export const saveProgress = async (uid, dateStr, progress) => {
  const ref = doc(db, 'users', uid, 'progress', dateStr);
  await setDoc(ref, {
    ...progress,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// Get progress for a date
export const getProgress = async (uid, dateStr) => {
  const ref = doc(db, 'users', uid, 'progress', dateStr);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
};

// Get progress for a date range (for streak calendar)
export const getProgressRange = async (uid, startDate, endDate) => {
  const q = query(
    collection(db, 'users', uid, 'progress'),
    where('__name__', '>=', startDate),
    where('__name__', '<=', endDate),
  );
  const snap = await getDocs(q);
  const result = {};
  snap.docs.forEach(d => {
    result[d.id] = d.data();
  });
  return result;
};

// ============================================================
// ART TIME TRACKING
// ============================================================

// Save art timer data
export const saveArtTime = async (uid, dateStr, seconds, weekStart) => {
  const ref = doc(db, 'users', uid, 'artTime', dateStr);
  await setDoc(ref, {
    seconds,
    weekStart: weekStart || '',
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// Get art time for a date
export const getArtTime = async (uid, dateStr) => {
  const ref = doc(db, 'users', uid, 'artTime', dateStr);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
};

// Get weekly art time (sum of all days in the week)
export const getWeeklyArtTime = async (uid, weekStart) => {
  const q = query(
    collection(db, 'users', uid, 'artTime'),
    where('weekStart', '==', weekStart),
  );
  const snap = await getDocs(q);
  let total = 0;
  snap.docs.forEach(d => {
    total += d.data().seconds || 0;
  });
  return total;
};

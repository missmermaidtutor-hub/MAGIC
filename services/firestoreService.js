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
  onSnapshot,
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
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    username: data.username || '',
    pseudonym: data.pseudonym || '',
    birthdate: data.birthdate || '',
    timezone: data.timezone || 'America/New_York',
    currentLocation: data.currentLocation || { country: '', state: '', city: '' },
    heartLocation: data.heartLocation || { country: '', state: '', city: '' },
    favoriteMediums: data.favoriteMediums || [],
    notificationPreference: data.notificationPreference || 'daily',
    allowWorkBoutique: data.allowWorkBoutique ?? false,
    anonymous: data.anonymous ?? true,
    gender: data.gender || '',
    phoneNumber: data.phoneNumber || '',
    openToPods: false,
    bio: data.bio || '',
    favoritePrompt: data.favoritePrompt || '',
    isPremium: false,
    premiumTrialExpiry: null,
    premiumExpiry: null,
    referralCode: 'MAGIC-' + uid.slice(0, 6).toUpperCase(),
    referralCount: 0,
    pseudonymChangeCount: data.pseudonymChangeCount || 0,
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

// Get all courages by a specific user (for "My Inspiring Works")
export const getUserCourages = async (uid) => {
  const q = query(
    collection(db, 'dailyCourages'),
    where('uid', '==', uid),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    return { ...data, docId: d.id, curatorUid: pathParts[1] };
  });
  return works;
};

// Get all curated galleries grouped by curator, excluding own art
export const getAllCuratedGalleriesGrouped = async (excludeUid) => {
  const works = await getAllCuratedGalleries();
  const grouped = {};
  for (const work of works) {
    if (work.curatorUid === excludeUid) continue;
    if (!grouped[work.curatorUid]) {
      grouped[work.curatorUid] = {
        uid: work.curatorUid,
        pseudonym: work.pseudonym || 'Anonymous',
        artworks: [],
      };
    }
    grouped[work.curatorUid].artworks.push(work);
  }
  return Object.values(grouped);
};

// ============================================================
// ART SAVES (tracking who saved whose art)
// ============================================================

// Record an art save (with duplicate check, skips self-saves)
export const recordArtSave = async (ownerUid, artworkId, saverUid, saverPseudonym) => {
  if (ownerUid === saverUid) return; // skip self-saves
  // Duplicate check
  const q = query(
    collection(db, 'artSaves'),
    where('artworkId', '==', artworkId),
    where('saverUid', '==', saverUid),
  );
  const snap = await getDocs(q);
  if (!snap.empty) return; // already saved
  await addDoc(collection(db, 'artSaves'), {
    artworkId,
    ownerUid,
    saverUid,
    saverPseudonym: saverPseudonym || 'Anonymous',
    savedAt: serverTimestamp(),
  });
};

// Remove an art save when un-candled
export const removeArtSave = async (artworkId, saverUid) => {
  const q = query(
    collection(db, 'artSaves'),
    where('artworkId', '==', artworkId),
    where('saverUid', '==', saverUid),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
};

// Get all saves of my art (for "My Inspiring Works" tab)
export const getMyArtSaves = async (ownerUid) => {
  const q = query(
    collection(db, 'artSaves'),
    where('ownerUid', '==', ownerUid),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

// ============================================================
// DISCUSSION PODS
// ============================================================

// Create a new discussion pod
export const createPod = async (name, memberUids, memberUsernameMap, adminUid) => {
  const docRef = await addDoc(collection(db, 'discussionPods'), {
    name,
    members: memberUids,
    memberUsernames: memberUsernameMap,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

// Update pod members
export const updatePodMembers = async (podId, memberUids, memberUsernameMap) => {
  const podRef = doc(db, 'discussionPods', podId);
  await updateDoc(podRef, {
    members: memberUids,
    memberUsernames: memberUsernameMap,
    updatedAt: serverTimestamp(),
  });
};

// Update pod name
export const updatePodName = async (podId, name) => {
  const podRef = doc(db, 'discussionPods', podId);
  await updateDoc(podRef, {
    name,
    updatedAt: serverTimestamp(),
  });
};

// Delete a pod
export const deletePod = async (podId) => {
  const podRef = doc(db, 'discussionPods', podId);
  await deleteDoc(podRef);
};

// Subscribe to pods the user belongs to (real-time)
export const subscribeToUserPods = (uid, callback, onError) => {
  const q = query(
    collection(db, 'discussionPods'),
    where('members', 'array-contains', uid),
  );
  return onSnapshot(q, (snap) => {
    const pods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(pods);
  }, (error) => {
    console.log('subscribeToUserPods error:', error);
    if (onError) onError(error);
  });
};

// Subscribe to messages in a pod (real-time)
export const subscribeToPodMessages = (podId, callback, onError) => {
  const q = query(
    collection(db, 'discussionPods', podId, 'messages'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(messages);
  }, (error) => {
    console.log('subscribeToPodMessages error:', error);
    if (onError) onError(error);
  });
};

// Send a message to a pod
export const sendPodMessage = async (podId, uid, username, text) => {
  await addDoc(collection(db, 'discussionPods', podId, 'messages'), {
    text,
    uid,
    username,
    createdAt: serverTimestamp(),
  });
};

// Get all users (admin needs this to assign members)
export const getAllUsers = async () => {
  const q = query(collection(db, 'users'), firestoreLimit(200));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
};

// Get all pods (admin)
export const getAllPods = async () => {
  const q = query(collection(db, 'discussionPods'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ============================================================
// PREMIUM
// ============================================================

// Grant premium trial (sets premiumTrialExpiry on user profile)
export const grantPremiumTrial = async (uid, expiryDate) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    premiumTrialExpiry: expiryDate,
    updatedAt: serverTimestamp(),
  });
};

// Set paid premium status
export const setPremium = async (uid, isPremium, expiryDate = null) => {
  const userRef = doc(db, 'users', uid);
  const updates = {
    isPremium,
    updatedAt: serverTimestamp(),
  };
  if (isPremium) {
    updates.premiumStartDate = serverTimestamp();
  }
  if (expiryDate) {
    updates.premiumExpiry = expiryDate;
  }
  await updateDoc(userRef, updates);
};

// ============================================================
// ANALYTICS
// ============================================================

// Get all user analytics for a specific date (admin dashboard)
export const getAnalyticsForDate = async (dateStr) => {
  const q = query(collection(db, 'analytics', dateStr, 'users'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
};

// ============================================================
// FEATURE VOTES & IDEAS
// ============================================================

// Vote for a coming-soon feature (one vote per user per feature)
export const voteForFeature = async (feature, voterUid) => {
  const q = query(
    collection(db, 'featureVotes'),
    where('feature', '==', feature),
    where('voterUid', '==', voterUid)
  );
  const existing = await getDocs(q);
  if (!existing.empty) return false; // already voted
  await addDoc(collection(db, 'featureVotes'), {
    feature,
    voterUid,
    createdAt: serverTimestamp(),
  });
  return true;
};

// Remove a vote for a coming-soon feature (un-vote)
export const removeFeatureVote = async (feature, voterUid) => {
  const q = query(
    collection(db, 'featureVotes'),
    where('feature', '==', feature),
    where('voterUid', '==', voterUid)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
};

// Get vote counts for all features
export const getFeatureVoteCounts = async () => {
  const snap = await getDocs(collection(db, 'featureVotes'));
  const counts = {};
  snap.docs.forEach(d => {
    const f = d.data().feature;
    counts[f] = (counts[f] || 0) + 1;
  });
  return counts;
};

// Get the set of features a user has already voted for
export const getUserFeatureVotes = async (uid) => {
  const q = query(collection(db, 'featureVotes'), where('voterUid', '==', uid));
  const snap = await getDocs(q);
  return new Set(snap.docs.map(d => d.data().feature));
};

// Submit a feature idea
export const submitFeatureIdea = async (text, submitterUid, submitterPseudonym) => {
  await addDoc(collection(db, 'featureIdeas'), {
    text,
    submitterUid,
    submitterPseudonym: submitterPseudonym || 'Anonymous',
    createdAt: serverTimestamp(),
  });
};

// ============================================================
// DIAGNOSTICS (Admin)
// ============================================================

// Get all users ordered by createdAt desc
export const getAllUsersOrdered = async () => {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
};

// Get all pseudonym claims
export const getAllPseudonymClaims = async () => {
  const snap = await getDocs(collection(db, 'pseudonyms'));
  return snap.docs.map(d => ({ key: d.id, ...d.data() }));
};

// Get all username claims
export const getAllUsernameClaims = async () => {
  const snap = await getDocs(collection(db, 'usernames'));
  return snap.docs.map(d => ({ key: d.id, ...d.data() }));
};

// Get all feature ideas (admin use, newest first)
export const getAllFeatureIdeas = async () => {
  const q = query(collection(db, 'featureIdeas'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ============================================================
// REFERRALS
// ============================================================

// Apply a referral code: find the referrer and increment their count
export const applyReferralCode = async (code, newUserUid) => {
  const q = query(
    collection(db, 'users'),
    where('referralCode', '==', code.trim().toUpperCase()),
    firestoreLimit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return false;

  const referrerDoc = snap.docs[0];
  const referrerUid = referrerDoc.id;

  // Don't let users refer themselves
  if (referrerUid === newUserUid) return false;

  // Increment referrer's referralCount
  const referrerRef = doc(db, 'users', referrerUid);
  const currentData = referrerDoc.data();
  await updateDoc(referrerRef, {
    referralCount: (currentData.referralCount || 0) + 1,
    updatedAt: serverTimestamp(),
  });

  // Set referredBy on the new user
  const newUserRef = doc(db, 'users', newUserUid);
  await updateDoc(newUserRef, {
    referredBy: code.trim().toUpperCase(),
    referredByUid: referrerUid,
    updatedAt: serverTimestamp(),
  });

  return true;
};

// Check if user has earned a referral trial (5+ referrals = 13-day trial)
export const checkAndGrantReferralTrial = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return false;

  const data = snap.data();
  if ((data.referralCount || 0) < 5) return false;

  // Check if already granted a referral trial
  if (data.referralTrialGranted) return false;

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 13);

  await updateDoc(userRef, {
    premiumTrialExpiry: expiry,
    referralTrialGranted: true,
    updatedAt: serverTimestamp(),
  });

  return true;
};

// ============================================================
// QUOTE LIKES (global tracking of how many users liked each quote)
// ============================================================

// Generate a stable key from quote text
const quoteKey = (text) => text.slice(0, 80).replace(/[^a-zA-Z0-9]/g, '_');

// Like a quote (one like per user per quote)
export const likeQuote = async (uid, quoteText, author) => {
  const key = quoteKey(quoteText);
  const q = query(
    collection(db, 'quoteLikes'),
    where('quoteKey', '==', key),
    where('uid', '==', uid),
  );
  const snap = await getDocs(q);
  if (!snap.empty) return; // already liked
  await addDoc(collection(db, 'quoteLikes'), {
    quoteKey: key,
    quoteText,
    author: author || '',
    uid,
    createdAt: serverTimestamp(),
  });
};

// Unlike a quote
export const unlikeQuote = async (uid, quoteText) => {
  const key = quoteKey(quoteText);
  const q = query(
    collection(db, 'quoteLikes'),
    where('quoteKey', '==', key),
    where('uid', '==', uid),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
};

// Get like counts for all quotes (returns { quoteKey: count })
export const getQuoteLikeCounts = async () => {
  const snap = await getDocs(collection(db, 'quoteLikes'));
  const counts = {};
  snap.docs.forEach(d => {
    const k = d.data().quoteKey;
    counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
};

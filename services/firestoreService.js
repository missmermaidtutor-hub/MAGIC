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
  increment,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

// Log a signup error to Firestore for admin review (signupErrors collection)
export const logSignupError = async (emailAttempted, errorCode, errorMessage) => {
  try {
    await addDoc(collection(db, 'signupErrors'), {
      emailAttempted: emailAttempted || '',
      errorCode: errorCode || 'unknown',
      errorMessage: errorMessage || '',
      occurredAt: serverTimestamp(),
      platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    });
  } catch (_) { /* never block anything for logging */ }
};

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
    premiumTrialType: null,
    premiumExpiry: null,
    activeDayCount: 0,
    trialTokens: 0,
    streak13TrialUsed: false,
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
  const doc_data = {
    uid,
    pseudonym: data.pseudonym || '',
    title: data.title || '',
    mediaType: data.mediaType || 'image',
    mediaUrl: data.mediaUrl || '',
    date: data.date,
    anonymous: data.anonymous ?? false,
    createdAt: serverTimestamp(),
  };
  // Store text content separately for text-type courages
  if (data.text) doc_data.text = data.text;
  if (data.textStyle) {
    // Strip undefined values — Firestore rejects them
    doc_data.textStyle = Object.fromEntries(
      Object.entries(data.textStyle).filter(([, v]) => v !== undefined)
    );
  }
  console.log(`[Courage] Uploading for uid=${uid}, date=${data.date}, title="${data.title}"`);
  const docRef = await addDoc(collection(db, 'dailyCourages'), doc_data);
  console.log(`[Courage] Saved as doc ${docRef.id}`);
  return docRef.id;
};

// Count how many times a user has won the daily courage vote
export const getUserWinCount = async (uid) => {
  const q = query(
    collection(db, 'dailyWinners'),
    where('uid', '==', uid),
  );
  const snap = await getDocs(q);
  return snap.size;
};

// Get all wins for a user (for Bookcase trophy wall)
export const getUserWins = async (uid) => {
  const q = query(
    collection(db, 'dailyWinners'),
    where('uid', '==', uid),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data())
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
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

  // Law: single submission → automatic winner, no votes needed
  if (courages.length === 1) {
    const solo = courages[0];
    const soloWinnerData = {
      date: dateStr,
      courageId: solo.id,
      uid: solo.uid,
      pseudonym: solo.anonymous ? 'Anonymous' : (solo.pseudonym || 'Anonymous'),
      title: solo.title || '',
      mediaType: solo.mediaType || 'image',
      mediaUrl: solo.mediaUrl || '',
      averageScore: 0,
      totalVotes: 0,
      autoWin: true,
      calculatedAt: serverTimestamp(),
    };
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(winnerRef);
        if (snap.exists()) return;
        transaction.set(winnerRef, soloWinnerData);
      });
    } catch (e) {
      const fallback = await getDoc(winnerRef);
      if (fallback.exists()) return fallback.data();
    }
    return soloWinnerData;
  }

  // Get all votes for that date
  const votes = await getAllVotesForDate(dateStr);

  // Law: multiple submissions, 0 votes → user with fewest prior wins wins
  if (votes.length === 0) {
    const allWinnersSnap = await getDocs(collection(db, 'dailyWinners'));
    const winCounts = {};
    courages.forEach(c => { winCounts[c.uid] = 0; });
    allWinnersSnap.docs.forEach(d => {
      const uid = d.data().uid;
      if (uid in winCounts) winCounts[uid]++;
    });

    const sortedByWins = [...courages].sort((a, b) => winCounts[a.uid] - winCounts[b.uid]);
    let noVoteWinner = sortedByWins[0];
    const minWins = winCounts[noVoteWinner.uid];
    const tiedNoVote = sortedByWins.filter(c => winCounts[c.uid] === minWins);

    if (tiedNoVote.length > 1) {
      const today = new Date();
      const todayMD = (today.getMonth() + 1) * 100 + today.getDate();
      let closestDiff = Infinity;
      for (const c of tiedNoVote) {
        try {
          const profile = await getUserProfile(c.uid);
          if (profile?.birthdate) {
            const parts = profile.birthdate.split('/');
            if (parts.length === 3) {
              const bMD = parseInt(parts[0]) * 100 + parseInt(parts[1]);
              const diff = Math.abs(bMD - todayMD);
              const wrappedDiff = Math.min(diff, 1231 - diff);
              if (wrappedDiff < closestDiff) {
                closestDiff = wrappedDiff;
                noVoteWinner = c;
              }
            }
          }
        } catch (e) {
          // Profile fetch failed for this user — skip, keep current best
          console.log(`Birthday tiebreak: profile fetch failed for ${c.uid}`, e);
        }
      }
    }

    const noVoteWinnerData = {
      date: dateStr,
      courageId: noVoteWinner.id,
      uid: noVoteWinner.uid,
      pseudonym: noVoteWinner.anonymous ? 'Anonymous' : (noVoteWinner.pseudonym || 'Anonymous'),
      title: noVoteWinner.title || '',
      mediaType: noVoteWinner.mediaType || 'image',
      mediaUrl: noVoteWinner.mediaUrl || '',
      averageScore: 0,
      totalVotes: 0,
      noVoteWin: true,
      calculatedAt: serverTimestamp(),
    };
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(winnerRef);
        if (snap.exists()) return;
        transaction.set(winnerRef, noVoteWinnerData);
      });
    } catch (e) {
      const fallback = await getDoc(winnerRef);
      if (fallback.exists()) return fallback.data();
    }
    return noVoteWinnerData;
  }

  // SCALE REVIEW NEEDED at ~500 users:
  // getAllVotesForDate() reads every vote doc for the day (500 users × avg sets ranked × 4 votes
  // each = potentially 50,000+ docs per call). Two concerns:
  //   1. calculateAndSetWinner reads all votes once — acceptable.
  //   2. InspireScreen re-fetches all votes between every ranking set (for fair exposure sorting).
  //      At 500 users this becomes expensive. Fix: maintain a dailyVoteCounts/{date} Firestore
  //      document with courageId → count using atomic increment(). Then between-set re-fetch
  //      is a single document read instead of 50K docs. Also: concurrent rankers loading the
  //      same stale countMap at session start can cause unequal artwork exposure — same fix applies.
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
      try {
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
      } catch (e) {
        // Profile fetch failed — skip this user, keep current best
        console.log(`Birthday tiebreak: profile fetch failed for ${c.uid}`, e);
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

// Strip undefined values one level deep (Firestore rejects undefined fields)
const sanitizeForFirestore = (obj) => {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    // Recurse one level for nested objects (e.g. textStyle)
    if (v !== null && typeof v === 'object' && !v.toDate && !v._methodName) {
      result[k] = sanitizeForFirestore(v);
    } else {
      result[k] = v;
    }
  }
  return result;
};

// Save artwork to user's private gallery
export const saveArtwork = async (uid, artwork) => {
  const artRef = await addDoc(collection(db, 'users', uid, 'artworks'), {
    ...sanitizeForFirestore(artwork),
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
  // Deduplicate: skip if same localId already exists
  const localId = work.id || work.localId || '';
  if (localId && existing.some(e => e.localId === localId)) {
    return existing.find(e => e.localId === localId).id;
  }
  const ref = await addDoc(collection(db, 'users', uid, 'curated'), {
    ...work,
    localId,
    pseudonym: work.pseudonym || '',
    curatedAt: serverTimestamp(),
  });
  return ref.id;
};

// Get user's curated gallery
// docId = Firestore document ID (used for artSave matching)
// id    = local artwork id stored in the document data (may be a number)
export const getUserCurated = async (uid) => {
  const q = query(
    collection(db, 'users', uid, 'curated'),
    orderBy('curatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, docId: d.id, ...d.data() }));
};

// Remove from curated — finds by localId field, not Firestore doc ID
export const removeCuratedWork = async (uid, localId) => {
  const q = query(
    collection(db, 'users', uid, 'curated'),
    where('localId', '==', localId),
    firestoreLimit(1),
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    await deleteDoc(snap.docs[0].ref);
  }
};

// Get all users' curated works for "Visit Community Curations"
export const getAllCuratedGalleries = async () => {
  try {
    const q = query(collectionGroup(db, 'curated'));
    const snap = await getDocs(q);
    console.log(`[Community] collectionGroup('curated') returned ${snap.docs.length} raw docs`);
    const works = snap.docs.map(d => {
      const data = d.data();
      // Extract uid from the document path: users/{uid}/curated/{id}
      const pathParts = d.ref.path.split('/');
      return { ...data, docId: d.id, curatorUid: pathParts[1], _ref: d.ref };
    });
    // Log each doc's identity fields for debugging
    works.forEach((w, i) => {
      console.log(`[Community] doc ${i}: curator=${w.curatorUid?.slice(0,8)}, localId="${w.localId || ''}", id="${w.id || ''}", title="${w.title || ''}", img=${w.imageUrl ? w.imageUrl.slice(0, 60) + '...' : 'none'}`);
    });
    // Deduplicate within each curator using multiple identity keys
    const deduped = [];
    const seen = new Set();
    // Sort newest first so we keep the latest version
    works.sort((a, b) => {
      const aTime = a.curatedAt?.toMillis?.() || a.curatedAt?.seconds * 1000 || 0;
      const bTime = b.curatedAt?.toMillis?.() || b.curatedAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });
    const dupeRefs = []; // refs to delete
    for (const work of works) {
      let isDupe = false;
      // Build identity keys for this work (only reliable unique identifiers)
      const keys = [];
      if (work.localId) keys.push(`${work.curatorUid}_lid_${work.localId}`);
      if (work.id) keys.push(`${work.curatorUid}_oid_${work.id}`);
      if (work.imageUrl) keys.push(`${work.curatorUid}_img_${work.imageUrl}`);

      // If ANY key was already seen, this is a duplicate
      for (const key of keys) {
        if (seen.has(key)) { isDupe = true; break; }
      }
      if (isDupe) {
        dupeRefs.push(work._ref);
      } else {
        keys.forEach(k => seen.add(k));
        deduped.push(work);
      }
    }
    // Clean up duplicates from Firestore in background
    if (dupeRefs.length > 0) {
      console.log(`[Community] Cleaning ${dupeRefs.length} duplicate curated docs from Firestore`);
      Promise.all(dupeRefs.map(ref => deleteDoc(ref).catch(() => {}))).catch(() => {});
    }
    console.log(`[Community] After dedup: ${deduped.length} unique docs`);
    // Remove internal _ref before returning
    return deduped.map(({ _ref, ...rest }) => rest);
  } catch (err) {
    console.log('[Community] collectionGroup curated query FAILED:', err);
    return [];
  }
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
        pseudonym: work.pseudonym || null, // resolved below if missing
        artworks: [],
      };
    }
    grouped[work.curatorUid].artworks.push(work);
  }
  // Resolve missing pseudonyms + profile images from user profiles
  const entries = Object.values(grouped);
  for (const entry of entries) {
    if (!entry.pseudonym || !entry.profileImageUrl) {
      try {
        const profile = await getUserProfile(entry.uid);
        if (!entry.pseudonym) entry.pseudonym = profile?.pseudonym || 'Anonymous';
        if (profile?.profileImageUrl) entry.profileImageUrl = profile.profileImageUrl;
      } catch {
        if (!entry.pseudonym) entry.pseudonym = 'Anonymous';
      }
    }
  }
  return entries;
};

// ============================================================
// ART SAVES (tracking who saved whose art)
// ============================================================

// Record an art save (with duplicate check, skips self-saves)
// artworkSnapshot: optional { mediaUrl, imageUrl, title, mediaType, text } embedded so Bookcase never needs a secondary lookup
export const recordArtSave = async (ownerUid, artworkId, saverUid, saverPseudonym, artworkSnapshot = {}) => {
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
    // Snapshot fields — present on new saves; absent on old saves (Bookcase falls back to lookup)
    ...(artworkSnapshot.mediaUrl   && { mediaUrl:   artworkSnapshot.mediaUrl }),
    ...(artworkSnapshot.imageUrl   && { imageUrl:   artworkSnapshot.imageUrl }),
    ...(artworkSnapshot.title      && { title:      artworkSnapshot.title }),
    ...(artworkSnapshot.mediaType  && { mediaType:  artworkSnapshot.mediaType }),
    ...(artworkSnapshot.text       && { text:       artworkSnapshot.text }),
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

// Backfill snapshot fields onto an old artSave doc (read-repair)
export const patchArtSave = async (saveDocId, snapshot) => {
  const fields = {};
  if (snapshot.mediaUrl)  fields.mediaUrl  = snapshot.mediaUrl;
  if (snapshot.imageUrl)  fields.imageUrl  = snapshot.imageUrl;
  if (snapshot.title)     fields.title     = snapshot.title;
  if (snapshot.mediaType) fields.mediaType = snapshot.mediaType;
  if (snapshot.text)      fields.text      = snapshot.text;
  if (Object.keys(fields).length === 0) return;
  await updateDoc(doc(db, 'artSaves', saveDocId), fields);
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

// Grant premium trial with type tracking (new Unbreakable Law)
// Uses max(existing, new) for expiry to never shorten an active trial
export const grantPremiumTrialWithType = async (uid, expiryDate, trialType) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? snap.data() : {};

  // Never shorten an existing active trial
  let finalExpiry = expiryDate;
  if (data.premiumTrialExpiry) {
    const existingExpiry = data.premiumTrialExpiry?.toDate?.()
      ?? (data.premiumTrialExpiry?.seconds
        ? new Date(data.premiumTrialExpiry.seconds * 1000)
        : new Date(data.premiumTrialExpiry));
    if (existingExpiry > finalExpiry) {
      finalExpiry = existingExpiry;
    }
  }

  const updates = {
    premiumTrialExpiry: finalExpiry,
    premiumTrialType: trialType,
    updatedAt: serverTimestamp(),
  };

  // If streak_13, also set the one-time flag
  if (trialType === 'streak_13') {
    updates.streak13TrialUsed = true;
  }

  await updateDoc(userRef, updates);
};

// Award a trial token (increments trialTokens on user profile)
export const awardTrialToken = async (uid) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    trialTokens: increment(1),
    updatedAt: serverTimestamp(),
  });
};

// Redeem a trial token: decrement tokens, start 3-day limited trial
export const redeemTrialTokenFirestore = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return false;

  const data = snap.data();
  if ((data.trialTokens || 0) <= 0) return false;

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 3);

  await updateDoc(userRef, {
    trialTokens: increment(-1),
    premiumTrialExpiry: expiry,
    premiumTrialType: 'active_day',
    updatedAt: serverTimestamp(),
  });

  return true;
};

// Award a friend gift token (one-time at first 13-day streak)
export const awardFriendToken = async (uid) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    friendTokens: increment(1),
    friendTokenEarned: true,
    updatedAt: serverTimestamp(),
  });
};

// Consume a friend gift token when attaching to an invite
export const consumeFriendToken = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return false;
  const data = snap.data();
  if ((data.friendTokens || 0) <= 0) return false;
  await updateDoc(userRef, {
    friendTokens: increment(-1),
    updatedAt: serverTimestamp(),
  });
  return true;
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

// ============================================================
// INVITATIONS (Invite Friends)
// ============================================================

// Save an invitation record under the user's subcollection
export const saveInvitation = async (uid, email, hasFriendToken = false) => {
  const data = {
    email: email.toLowerCase().trim(),
    sentAt: serverTimestamp(),
    converted: false,
  };
  if (hasFriendToken) data.hasFriendToken = true;
  const ref = await addDoc(collection(db, 'users', uid, 'invitations'), data);
  return ref.id;
};

// Get all invitations sent by a user
export const getUserInvitations = async (uid) => {
  const q = query(
    collection(db, 'users', uid, 'invitations'),
    orderBy('sentAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Grant +7 days of premium trial for sending an invitation
export const grantInviteWeek = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const now = new Date();
  let expiry;

  if (data.premiumTrialExpiry) {
    // Convert Firestore Timestamp to Date if needed
    const currentExpiry = data.premiumTrialExpiry.toDate
      ? data.premiumTrialExpiry.toDate()
      : new Date(data.premiumTrialExpiry);
    if (currentExpiry > now) {
      // Still active — extend by 7 days
      expiry = new Date(currentExpiry.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      // Expired — start fresh from now
      expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  } else {
    // No existing trial — set from now
    expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  await updateDoc(userRef, {
    premiumTrialExpiry: expiry,
    updatedAt: serverTimestamp(),
  });
};

// Check if a newly signed-up user's email matches any pending invitation, mark converted
// When converted, grants the INVITER +7 days premium. If the invite carried a friend token,
// also awards the NEW USER a trial token.
export const checkAndConvertInvitation = async (newUserEmail, newUserUid) => {
  if (!newUserEmail) return;
  const normalizedEmail = newUserEmail.toLowerCase().trim();

  // Query across all users' invitations subcollections
  const q = query(
    collectionGroup(db, 'invitations'),
    where('email', '==', normalizedEmail),
    where('converted', '==', false),
  );
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    await updateDoc(d.ref, { converted: true, convertedAt: serverTimestamp() });

    // Extract inviter UID from path: users/{uid}/invitations/{id}
    const pathParts = d.ref.path.split('/');
    const inviterUid = pathParts[1];
    if (inviterUid) {
      // Grant inviter +7 days premium
      await grantInviteWeek(inviterUid);
    }

    // If invite carried a friend token, award the new user a trial token
    const data = d.data();
    if (data.hasFriendToken && newUserUid) {
      await awardTrialToken(newUserUid);
    }
  }
};

// Get the admin-editable invite email template
export const getInviteTemplate = async () => {
  const ref = doc(db, 'appConfig', 'inviteTemplate');
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
};

// Save the invite email template (admin only)
export const saveInviteTemplate = async (subject, body) => {
  const ref = doc(db, 'appConfig', 'inviteTemplate');
  await setDoc(ref, {
    subject,
    body,
    updatedAt: serverTimestamp(),
  });
};

// Get all invitations across all users (admin — for analytics)
export const getAllInvitations = async () => {
  const q = query(collectionGroup(db, 'invitations'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    const pathParts = d.ref.path.split('/');
    return { ...data, docId: d.id, inviterUid: pathParts[1] };
  });
};

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

// FAQ — stored in appConfig/faq document
export const getFaqItems = async () => {
  const snap = await getDoc(doc(db, 'appConfig', 'faq'));
  if (snap.exists()) return snap.data().items || [];
  return [];
};

export const saveFaqItems = async (items) => {
  await setDoc(doc(db, 'appConfig', 'faq'), { items, updatedAt: serverTimestamp() });
};

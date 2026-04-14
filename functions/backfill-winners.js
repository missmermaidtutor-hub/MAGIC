/**
 * backfill-winners.js
 *
 * Scans all past dates in dailyCourages and writes a dailyWinners document
 * for any date that doesn't already have one.
 *
 * Usage (from repo root):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node functions/backfill-winners.js
 *
 * Or if you've run `gcloud auth application-default login`:
 *   node functions/backfill-winners.js
 *
 * Get a service account key from:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 */

'use strict';

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// ─── Helper: get all courages for a date ─────────────────────────────────────
async function getCouragesForDate(dateStr) {
  const snap = await db.collection('dailyCourages').where('date', '==', dateStr).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── Helper: get all votes for a date ────────────────────────────────────────
async function getAllVotesForDate(dateStr) {
  const snap = await db.collection('votes').where('date', '==', dateStr).get();
  return snap.docs.map(d => d.data());
}

// ─── Helper: get user profile ─────────────────────────────────────────────────
async function getUserProfile(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? snap.data() : null;
}

// ─── Winner calculation (mirrors calculateAndSetWinner in firestoreService.js) ─
async function calculateWinner(dateStr, dryRun) {
  const winnerRef = db.collection('dailyWinners').doc(dateStr);

  // Skip if winner already exists
  const existing = await winnerRef.get();
  if (existing.exists) {
    console.log(`  [${dateStr}] already has a winner — skipping`);
    return null;
  }

  const courages = await getCouragesForDate(dateStr);
  if (courages.length === 0) {
    console.log(`  [${dateStr}] no courages — skipping`);
    return null;
  }

  // Single submission → auto-win
  if (courages.length === 1) {
    const solo = courages[0];
    const data = {
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
      calculatedAt: FieldValue.serverTimestamp(),
    };
    console.log(`  [${dateStr}] auto-win (solo): ${data.pseudonym} "${data.title}"`);
    if (!dryRun) await winnerRef.set(data);
    return data;
  }

  const votes = await getAllVotesForDate(dateStr);

  // Multiple submissions, 0 votes → fewest-wins tiebreak → birthday tiebreak
  if (votes.length === 0) {
    const allWinnersSnap = await db.collection('dailyWinners').get();
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
      // Parse date string to get MMDD for that specific date (not today)
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateMD = m * 100 + d;
      let closestDiff = Infinity;
      for (const c of tiedNoVote) {
        try {
          const profile = await getUserProfile(c.uid);
          if (profile?.birthdate) {
            const parts = profile.birthdate.split('/');
            if (parts.length === 3) {
              const bMD = parseInt(parts[0]) * 100 + parseInt(parts[1]);
              const diff = Math.abs(bMD - dateMD);
              const wrappedDiff = Math.min(diff, 1231 - diff);
              if (wrappedDiff < closestDiff) {
                closestDiff = wrappedDiff;
                noVoteWinner = c;
              }
            }
          }
        } catch (e) {
          console.log(`    Birthday tiebreak: profile fetch failed for ${c.uid}`, e.message);
        }
      }
    }

    const data = {
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
      calculatedAt: FieldValue.serverTimestamp(),
    };
    console.log(`  [${dateStr}] no-vote win: ${data.pseudonym} "${data.title}" (${courages.length} submissions)`);
    if (!dryRun) await winnerRef.set(data);
    return data;
  }

  // Has votes → lowest average score wins
  const scoreMap = {};
  for (const vote of votes) {
    if (!scoreMap[vote.courageId]) scoreMap[vote.courageId] = { total: 0, count: 0 };
    scoreMap[vote.courageId].total += vote.score;
    scoreMap[vote.courageId].count += 1;
  }

  const scoredCourages = courages
    .filter(c => scoreMap[c.id])
    .map(c => ({
      ...c,
      averageScore: scoreMap[c.id].total / scoreMap[c.id].count,
      totalVotes: scoreMap[c.id].count,
    }))
    .sort((a, b) => a.averageScore - b.averageScore);

  if (scoredCourages.length === 0) {
    console.log(`  [${dateStr}] votes exist but no scores match courage ids — skipping`);
    return null;
  }

  let winner = scoredCourages[0];
  const tied = scoredCourages.filter(c => c.averageScore === winner.averageScore);
  if (tied.length > 1) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateMD = m * 100 + d;
    let closestDiff = Infinity;
    for (const c of tied) {
      try {
        const profile = await getUserProfile(c.uid);
        if (profile?.birthdate) {
          const parts = profile.birthdate.split('/');
          if (parts.length === 3) {
            const bMD = parseInt(parts[0]) * 100 + parseInt(parts[1]);
            const diff = Math.abs(bMD - dateMD);
            const wrappedDiff = Math.min(diff, 1231 - diff);
            if (wrappedDiff < closestDiff) {
              closestDiff = wrappedDiff;
              winner = c;
            }
          }
        }
      } catch (e) {
        console.log(`    Birthday tiebreak: profile fetch failed for ${c.uid}`, e.message);
      }
    }
  }

  const data = {
    date: dateStr,
    courageId: winner.id,
    uid: winner.uid,
    pseudonym: winner.anonymous ? 'Anonymous' : (winner.pseudonym || 'Anonymous'),
    title: winner.title || '',
    mediaType: winner.mediaType || 'image',
    mediaUrl: winner.mediaUrl || '',
    averageScore: winner.averageScore,
    totalVotes: winner.totalVotes,
    calculatedAt: FieldValue.serverTimestamp(),
  };
  console.log(`  [${dateStr}] voted win: ${data.pseudonym} "${data.title}" (avg ${data.averageScore.toFixed(2)}, ${data.totalVotes} votes)`);
  if (!dryRun) await winnerRef.set(data);
  return data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('=== DRY RUN — no writes will be made ===\n');

  console.log('Fetching all dates from dailyCourages...');
  const allCouragesSnap = await db.collection('dailyCourages').get();

  // Collect unique dates, filter out today and future
  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  const dates = new Set();
  allCouragesSnap.docs.forEach(d => {
    const date = d.data().date;
    if (date && date < todayStr) dates.add(date);
  });

  const sortedDates = [...dates].sort();
  console.log(`Found ${sortedDates.length} past dates with courage submissions\n`);

  let filled = 0;
  let skipped = 0;

  for (const dateStr of sortedDates) {
    const result = await calculateWinner(dateStr, dryRun);
    if (result) filled++;
    else skipped++;
  }

  console.log(`\n=== Done ===`);
  console.log(`  Winners written: ${dryRun ? 0 : filled} (${filled} eligible)`);
  console.log(`  Skipped (already had winner or no data): ${skipped}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

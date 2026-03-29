const functions = require('firebase-functions');
const v1 = require('firebase-functions/v1');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// Get yesterday's date in EST (America/New_York)
function getESTYesterday() {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  est.setDate(est.getDate() - 1);
  const y = est.getFullYear();
  const m = String(est.getMonth() + 1).padStart(2, '0');
  const d = String(est.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Runs at midnight Eastern (America/New_York) every day.
 * Copies all dailyCourages from yesterday into votingGallery/{date}/entries/
 * so the Inspire screen can display them for voting.
 */
exports.transferCouragesToVoting = onSchedule(
  {
    schedule: '0 0 * * *', // midnight Eastern (cron interpreted in timeZone below)
    timeZone: 'America/New_York',
    region: 'us-east1',
  },
  async () => {
    const dateStr = getESTYesterday();
    console.log(`Transferring courages for ${dateStr} to voting gallery...`);

    // Query all courages submitted on this date
    const couragesSnap = await db
      .collection('dailyCourages')
      .where('date', '==', dateStr)
      .get();

    if (couragesSnap.empty) {
      console.log(`No courages found for ${dateStr}. Skipping.`);
      return;
    }

    const batch = db.batch();
    let count = 0;

    couragesSnap.forEach((doc) => {
      const entryRef = db
        .collection('votingGallery')
        .doc(dateStr)
        .collection('entries')
        .doc(doc.id);

      batch.set(entryRef, {
        ...doc.data(),
        transferredAt: new Date(),
      });
      count++;
    });

    await batch.commit();
    console.log(`Transferred ${count} courages for ${dateStr} to voting gallery.`);
  }
);

// ── Helper: delete all docs in a collection/query (batched) ──
async function deleteQueryBatch(query) {
  let totalDeleted = 0;
  let snap = await query.limit(400).get();
  while (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snap.size;
    snap = await query.limit(400).get();
  }
  return totalDeleted;
}

// ── Helper: delete a subcollection under a document ──
async function deleteSubcollection(docRef, subcollectionName) {
  return deleteQueryBatch(docRef.collection(subcollectionName));
}

/**
 * Triggered automatically when a Firebase Auth user is deleted.
 * Clears all user data from Firestore:
 *  1. User subcollections (artworks, inspirations, curated, manifests, progress, artTime, goals)
 *  2. User profile document (users/{uid})
 *  3. Username & pseudonym claims
 *  4. Documents where UID is stored as a field (dailyCourages, votes, artSaves, etc.)
 *  5. Analytics subcollection entries
 *  6. Discussion pod messages authored by the user
 */
exports.clearData = v1
  .region('us-east1')
  .auth.user()
  .onDelete(async (user) => {
    const uid = user.uid;
    console.log(`Clearing all data for user ${uid}...`);

    // ── 1. Delete user subcollections (from user_privacy.json) ──
    const userDocRef = db.collection('users').doc(uid);
    const subcollections = [
      'artworks', 'inspirations', 'curated', 'manifests',
      'progress', 'artTime', 'goals',
    ];
    for (const sub of subcollections) {
      const count = await deleteSubcollection(userDocRef, sub);
      if (count > 0) console.log(`  Deleted ${count} docs from users/${uid}/${sub}`);
    }

    // ── 2. Delete the user profile document ──
    await userDocRef.delete();
    console.log(`  Deleted user profile users/${uid}`);

    // ── 3. Release username & pseudonym claims ──
    // Username claim: doc ID is lowercase username, has uid field
    const usernameSnap = await db.collection('usernames').where('uid', '==', uid).get();
    for (const doc of usernameSnap.docs) {
      await doc.ref.delete();
      console.log(`  Released username claim: ${doc.id}`);
    }

    const pseudonymSnap = await db.collection('pseudonyms').where('uid', '==', uid).get();
    for (const doc of pseudonymSnap.docs) {
      await doc.ref.delete();
      console.log(`  Released pseudonym claim: ${doc.id}`);
    }

    // ── 4. Delete documents where UID is a field ──
    const fieldQueries = [
      { collection: 'dailyCourages', field: 'uid' },
      { collection: 'votes', field: 'voterUid' },
      { collection: 'artSaves', field: 'saverUid' },
      { collection: 'featureVotes', field: 'voterUid' },
      { collection: 'featureIdeas', field: 'submitterUid' },
      { collection: 'quoteLikes', field: 'uid' },
    ];

    for (const { collection, field } of fieldQueries) {
      const count = await deleteQueryBatch(
        db.collection(collection).where(field, '==', uid)
      );
      if (count > 0) console.log(`  Deleted ${count} docs from ${collection} (${field}=${uid})`);
    }

    // ── 5. Delete analytics entries (analytics/{dateStr}/users/{uid}) ──
    // Query all date docs, then delete the user's subdoc in each
    const analyticsDates = await db.collection('analytics').get();
    for (const dateDoc of analyticsDates.docs) {
      const userAnalyticsRef = dateDoc.ref.collection('users').doc(uid);
      const userAnalyticsSnap = await userAnalyticsRef.get();
      if (userAnalyticsSnap.exists) {
        await userAnalyticsRef.delete();
        console.log(`  Deleted analytics/${dateDoc.id}/users/${uid}`);
      }
    }

    // ── 6. Delete discussion pod messages authored by user ──
    const podsSnap = await db.collection('discussionPods').get();
    for (const podDoc of podsSnap.docs) {
      const count = await deleteQueryBatch(
        podDoc.ref.collection('messages').where('uid', '==', uid)
      );
      if (count > 0) console.log(`  Deleted ${count} messages from pod ${podDoc.id}`);
    }

    console.log(`All data cleared for user ${uid}.`);
  });

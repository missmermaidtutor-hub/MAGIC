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
 * Runs at midnight EST (5:00 AM UTC) every day.
 * Copies all dailyCourages from yesterday into votingGallery/{date}/entries/
 * so the Inspire screen can display them for voting.
 */
exports.transferCouragesToVoting = onSchedule(
  {
    schedule: '0 5 * * *', // 5:00 AM UTC = midnight EST
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

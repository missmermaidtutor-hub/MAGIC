import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get MAGIC task completion for a given date.
 * SHARED by HomeScreen (streak arrow) and StreakScreen (calendar).
 * Both screens MUST use this same function so stars look identical.
 *
 * M (Red)    = Manifest: write in any of the Muse, Dump, or Vision text boxes
 * A (Orange) = Art: use daily challenge prompt, sketch, write, record photo, use timer or stopwatch
 * G (Yellow) = Grow: set a goal OR check in on yesterday's goal
 * I (Green)  = Inspire: rank at least one set of 4 courages
 * C (Blue)   = Connect/Courage: share courage, click an inspiring work, send art via email, or browse curated galleries
 */
export const getTasksForDate = async (dateStr) => {
  // --- M (Red): Manifest ---
  // Write in any one or all of Muse, Dump, or Vision text boxes
  let hasManifest = false;
  const manifestRaw = await AsyncStorage.getItem(`manifest_${dateStr}`);
  if (manifestRaw) {
    try {
      const entry = JSON.parse(manifestRaw);
      hasManifest = !!(
        (entry.callMuse && entry.callMuse.trim()) ||
        (entry.dumpStalls && entry.dumpStalls.trim()) ||
        (entry.manifestVision && entry.manifestVision.trim())
      );
    } catch (e) {}
  }

  // --- A (Orange): Art ---
  // Use daily challenge prompt, sketch, write, record photo, use timer or stopwatch
  const dailyArtTime = await AsyncStorage.getItem(`art_time_${dateStr}`);
  const timerUsed = !!(dailyArtTime && parseInt(dailyArtTime) > 0);
  const artCreated = (await AsyncStorage.getItem(`art_created_${dateStr}`)) === 'true';
  const personalArtworksRaw = await AsyncStorage.getItem('personal_artworks');
  const personalArtworks = personalArtworksRaw ? JSON.parse(personalArtworksRaw) : [];
  const publicArtworksRaw = await AsyncStorage.getItem('public_artworks');
  const publicArtworks = publicArtworksRaw ? JSON.parse(publicArtworksRaw) : [];
  const uploadedOnDate = personalArtworks.some(a => a.date === dateStr) || publicArtworks.some(a => a.date === dateStr);
  const hasArt = timerUsed || artCreated || uploadedOnDate;

  // --- G (Yellow): Grow ---
  // Set a goal OR check in on yesterday's goal (acknowledged yes or no)
  let hasGoal = false;
  if (manifestRaw) {
    try {
      const entry = JSON.parse(manifestRaw);
      hasGoal = !!(entry.growthGoal && entry.growthGoal.trim());
    } catch (e) {}
  }
  // Also count if the user checked in on their goal that day
  if (!hasGoal) {
    const goalAck = await AsyncStorage.getItem(`goal_acknowledged_${dateStr}`);
    hasGoal = goalAck === 'yes' || goalAck === 'no'; // any check-in counts
  }

  // --- I (Green): Inspire ---
  // Rank at least one set of 4 courages
  const hasInspire = (await AsyncStorage.getItem(`ranked_${dateStr}`)) === 'true';

  // --- C (Blue): Connect / Courage ---
  // Share courage, click an inspiring work, send art via email, or browse curated galleries
  const courageUploaded = (await AsyncStorage.getItem(`courage_uploaded_${dateStr}`)) === 'true';
  const hasCourageUpload = publicArtworks.some(a => a.date === dateStr);
  const inspirationSaved = (await AsyncStorage.getItem(`inspiration_saved_${dateStr}`)) === 'true';
  const connectedInteracted = (await AsyncStorage.getItem(`connected_${dateStr}`)) === 'true';
  const sentEmail = (await AsyncStorage.getItem(`email_sent_${dateStr}`)) === 'true';
  const browsedCurated = (await AsyncStorage.getItem(`browsed_${dateStr}`)) === 'true';
  const favoriteArtworksRaw = await AsyncStorage.getItem('favorite_artworks');
  const favoriteArtworks = favoriteArtworksRaw ? JSON.parse(favoriteArtworksRaw) : [];
  const savedInspirationOnDate = favoriteArtworks.some(a => a.date === dateStr);
  const hasConnect = courageUploaded || hasCourageUpload || inspirationSaved || connectedInteracted || sentEmail || browsedCurated || savedInspirationOnDate;

  return {
    manifest: hasManifest,
    art: hasArt,
    goal: hasGoal,
    inspire: hasInspire,
    courage: hasConnect,
  };
};

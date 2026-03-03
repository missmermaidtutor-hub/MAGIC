// EST/EDT timezone utilities
// All voting boundaries use Eastern Time (America/New_York)

const EST_OFFSET = -5; // EST is UTC-5
const EDT_OFFSET = -4; // EDT is UTC-4

// Check if a date falls within US Eastern Daylight Time
// DST: second Sunday of March to first Sunday of November
const isDST = (date) => {
  const year = date.getUTCFullYear();
  // Second Sunday of March
  const marchFirst = new Date(Date.UTC(year, 2, 1));
  const marchSecondSunday = new Date(Date.UTC(year, 2, 8 + (7 - marchFirst.getUTCDay()) % 7));
  // First Sunday of November
  const novFirst = new Date(Date.UTC(year, 10, 1));
  const novFirstSunday = new Date(Date.UTC(year, 10, 1 + (7 - novFirst.getUTCDay()) % 7));

  // DST starts at 2am EST (7am UTC) on second Sunday of March
  const dstStart = new Date(marchSecondSunday.getTime() + 7 * 60 * 60 * 1000);
  // DST ends at 2am EDT (6am UTC) on first Sunday of November
  const dstEnd = new Date(novFirstSunday.getTime() + 6 * 60 * 60 * 1000);

  return date >= dstStart && date < dstEnd;
};

// Get the current Eastern timezone offset in hours
const getEasternOffset = (date = new Date()) => {
  return isDST(date) ? EDT_OFFSET : EST_OFFSET;
};

// Get current date string (YYYY-MM-DD) in Eastern Time
export const getESTDate = (date = new Date()) => {
  const offset = getEasternOffset(date);
  const eastern = new Date(date.getTime() + offset * 60 * 60 * 1000);
  return eastern.toISOString().split('T')[0];
};

// Get yesterday's date string (YYYY-MM-DD) in Eastern Time
export const getESTYesterday = (date = new Date()) => {
  const offset = getEasternOffset(date);
  const eastern = new Date(date.getTime() + offset * 60 * 60 * 1000);
  eastern.setUTCDate(eastern.getUTCDate() - 1);
  return eastern.toISOString().split('T')[0];
};

// Get the date string for 2 days ago in Eastern Time
export const getESTDayBeforeYesterday = (date = new Date()) => {
  const offset = getEasternOffset(date);
  const eastern = new Date(date.getTime() + offset * 60 * 60 * 1000);
  eastern.setUTCDate(eastern.getUTCDate() - 2);
  return eastern.toISOString().split('T')[0];
};

// Get next midnight EST as a Date object (UTC)
export const getNextESTMidnight = () => {
  const now = new Date();
  const offset = getEasternOffset(now);
  const eastern = new Date(now.getTime() + offset * 60 * 60 * 1000);
  // Next midnight in Eastern
  const nextMidnight = new Date(Date.UTC(
    eastern.getUTCFullYear(),
    eastern.getUTCMonth(),
    eastern.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  // Convert back to UTC
  return new Date(nextMidnight.getTime() - offset * 60 * 60 * 1000);
};

// Milliseconds until next midnight EST
export const msUntilESTMidnight = () => {
  return getNextESTMidnight().getTime() - Date.now();
};

// Format a date string (YYYY-MM-DD) as display date (M/D/YYYY)
export const formatDisplayDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
};

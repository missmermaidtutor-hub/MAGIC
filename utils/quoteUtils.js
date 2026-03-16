import AsyncStorage from '@react-native-async-storage/async-storage';
import { getESTDate } from './dateUtils';

// Smart daily quote selection:
// - No quote repeated until all 299 have been shown (max gap = 299 days)
// - No same author two days in a row
// - Both HomeScreen and ManifestScreen read the same cached result
export const getTodayQuote = async (quotesData) => {
  const today = getESTDate();

  // Check if already computed for today
  const savedDate = await AsyncStorage.getItem('quote_date');
  const savedIndex = await AsyncStorage.getItem('quote_today_index');
  if (savedDate === today && savedIndex != null) {
    return quotesData[parseInt(savedIndex)];
  }

  // Load history (array of previously used indices)
  const historyRaw = await AsyncStorage.getItem('quote_history');
  let history = historyRaw ? JSON.parse(historyRaw) : [];

  // Get yesterday's author (from the actual shown quote, not a formula)
  const yesterdayAuthor = savedIndex != null ? quotesData[parseInt(savedIndex)]?.author : null;

  // Build available pool (not in history)
  const usedSet = new Set(history);
  let available = quotesData
    .map((q, i) => i)
    .filter(i => !usedSet.has(i));

  // If all quotes used, reset history and start new cycle
  if (available.length === 0) {
    history = [];
    available = quotesData.map((q, i) => i);
  }

  // Prefer different author than yesterday
  const diffAuthor = available.filter(i => quotesData[i].author !== yesterdayAuthor);
  if (diffAuthor.length > 0) available = diffAuthor;

  // Pick deterministically based on day of year
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const picked = available[dayOfYear % available.length];

  // Save state
  history.push(picked);
  await AsyncStorage.setItem('quote_date', today);
  await AsyncStorage.setItem('quote_today_index', String(picked));
  await AsyncStorage.setItem('quote_history', JSON.stringify(history));

  return quotesData[picked];
};

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import quotesData from '../quotes.json';

const SCREEN_WIDTH = Dimensions.get('window').width - 40; // minus padding

// ============================================================
// STAR COMPONENTS
// ============================================================

// Year Dot — smallest, earned every 365 days of streak
const YearDot = ({ size = 10 }) => (
  <View style={{
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: '#4FC3F7',
    margin: 3,
    shadowColor: '#4FC3F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  }} />
);

// Month Star — small filled star, earned every 28 days (4 weeks)
const MonthStar = ({ size = 18 }) => {
  const points = 5;
  return (
    <View style={{ width: size, height: size, margin: 3, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.4,
        height: size * 0.4,
        borderRadius: size * 0.2,
        backgroundColor: '#4FC3F7',
        position: 'absolute',
      }} />
      {[...Array(points)].map((_, i) => {
        const angle = (i * 360 / points) - 90;
        return (
          <View key={i} style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.1,
            borderRightWidth: size * 0.1,
            borderBottomWidth: size * 0.38,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: '#4FC3F7',
            transform: [
              { rotate: `${angle + 90}deg` },
              { translateY: -size * 0.12 },
            ],
          }} />
        );
      })}
    </View>
  );
};

// 7-pointed Week Star — earned every 7 consecutive days, sharp triangle points
const WeekStar = ({ size = 24 }) => {
  const points = 7;
  return (
    <View style={{ width: size, height: size, margin: 4, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.35,
        height: size * 0.35,
        borderRadius: size * 0.175,
        backgroundColor: '#4FC3F7',
        position: 'absolute',
        zIndex: 5,
      }} />
      {[...Array(points)].map((_, i) => {
        const angle = (i * 360 / points) - 90;
        return (
          <View key={i} style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.09,
            borderRightWidth: size * 0.09,
            borderBottomWidth: size * 0.4,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: '#4FC3F7',
            transform: [
              { rotate: `${angle + 90}deg` },
              { translateY: -size * 0.15 },
            ],
          }} />
        );
      })}
    </View>
  );
};

// Large 5-pointed MAGIC star — today's active star
// Each point fills independently: M=Manifest, A=Art, G=Goal, I=Inspire, C=Courage
const MagicStar = ({ tasks = {}, size = 52 }) => {
  const pointColors = {
    manifest: tasks.manifest ? '#DDA0DD' : '#1a2a4a',
    art:      tasks.art      ? '#FFD700' : '#1a2a4a',
    goal:     tasks.goal     ? '#FF6B6B' : '#1a2a4a',
    inspire:  tasks.inspire  ? '#87CEEB' : '#1a2a4a',
    courage:  tasks.courage  ? '#90EE90' : '#1a2a4a',
  };

  const pointAngles = [
    { key: 'manifest', angle: -90 },
    { key: 'art',      angle: -90 + 72 },
    { key: 'goal',     angle: -90 + 144 },
    { key: 'inspire',  angle: -90 + 216 },
    { key: 'courage',  angle: -90 + 288 },
  ];

  const allComplete = tasks.manifest && tasks.art && tasks.goal && tasks.inspire && tasks.courage;
  const anyComplete = tasks.manifest || tasks.art || tasks.goal || tasks.inspire || tasks.courage;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {/* Glow when all complete */}
        {allComplete && (
          <View style={{
            position: 'absolute',
            width: size + 14,
            height: size + 14,
            borderRadius: (size + 14) / 2,
            backgroundColor: 'rgba(79, 195, 247, 0.3)',
          }} />
        )}
        {/* Gold star outline — slightly larger triangles behind the colored ones */}
        {pointAngles.map(({ key, angle }) => (
          <View key={`outline-${key}`} style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.15,
            borderRightWidth: size * 0.15,
            borderBottomWidth: size * 0.48,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: '#FFD700',
            transform: [
              { rotate: `${angle + 90}deg` },
              { translateY: -size * 0.155 },
            ],
          }} />
        ))}
        {/* Center */}
        <View style={{
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          backgroundColor: allComplete ? '#4FC3F7' : '#0d1530',
          position: 'absolute',
          zIndex: 10,
        }} />
        {/* 5 colored points (on top of gold outline) */}
        {pointAngles.map(({ key, angle }) => (
          <View key={key} style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.12,
            borderRightWidth: size * 0.12,
            borderBottomWidth: size * 0.42,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: pointColors[key],
            transform: [
              { rotate: `${angle + 90}deg` },
              { translateY: -size * 0.14 },
            ],
          }} />
        ))}
      </View>
      {/* MAGIC labels under star */}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {['M', 'A', 'G', 'I', 'C'].map((letter, i) => {
          const keys = ['manifest', 'art', 'goal', 'inspire', 'courage'];
          const colors = ['#DDA0DD', '#FFD700', '#FF6B6B', '#87CEEB', '#90EE90'];
          return (
            <Text key={letter} style={{
              fontSize: 9,
              fontWeight: 'bold',
              color: tasks[keys[i]] ? colors[i] : '#2a3a5a',
              marginHorizontal: 1,
            }}>{letter}</Text>
          );
        })}
      </View>
    </View>
  );
};

// Empty star outline — shown when streak is 0 (no progress)
const EmptyStar = ({ size = 52 }) => (
  <View style={{ alignItems: 'center' }}>
    <View style={{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <View style={{
        position: 'absolute',
        width: size + 6,
        height: size + 6,
        borderRadius: (size + 6) / 2,
        borderWidth: 1,
        borderColor: '#2a3a5a',
      }} />
      <View style={{
        width: size * 0.3,
        height: size * 0.3,
        borderRadius: size * 0.15,
        backgroundColor: '#0d1530',
        position: 'absolute',
        zIndex: 10,
      }} />
      {[...Array(5)].map((_, i) => {
        const angle = (i * 72) - 90;
        return (
          <View key={i} style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.12,
            borderRightWidth: size * 0.12,
            borderBottomWidth: size * 0.42,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: '#1a2a4a',
            transform: [
              { rotate: `${angle + 90}deg` },
              { translateY: -size * 0.14 },
            ],
          }} />
        );
      })}
    </View>
    <View style={{ flexDirection: 'row', marginTop: 4 }}>
      {['M', 'A', 'G', 'I', 'C'].map((letter) => (
        <Text key={letter} style={{ fontSize: 9, fontWeight: 'bold', color: '#2a3a5a', marginHorizontal: 1 }}>{letter}</Text>
      ))}
    </View>
  </View>
);

// Past day star — smaller 5-pointed, fully filled (completed day in streak)
const DayStar = ({ size = 30 }) => {
  const points = 5;
  return (
    <View style={{ width: size + 4, height: size + 4, margin: 3, justifyContent: 'center', alignItems: 'center' }}>
      {/* Gold outline */}
      {[...Array(points)].map((_, i) => {
        const angle = (i * 72) - 90;
        return (
          <View key={`o-${i}`} style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.13,
            borderRightWidth: size * 0.13,
            borderBottomWidth: size * 0.44,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: '#B8860B',
            transform: [
              { rotate: `${angle + 90}deg` },
              { translateY: -size * 0.14 },
            ],
          }} />
        );
      })}
      {/* Center */}
      <View style={{
        width: size * 0.28,
        height: size * 0.28,
        borderRadius: size * 0.14,
        backgroundColor: '#4FC3F7',
        position: 'absolute',
        zIndex: 10,
      }} />
      {/* Filled points */}
      {[...Array(points)].map((_, i) => {
        const angle = (i * 72) - 90;
        const colors = ['#DDA0DD', '#FFD700', '#FF6B6B', '#87CEEB', '#90EE90'];
        return (
          <View key={i} style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.1,
            borderRightWidth: size * 0.1,
            borderBottomWidth: size * 0.38,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: colors[i],
            transform: [
              { rotate: `${angle + 90}deg` },
              { translateY: -size * 0.13 },
            ],
          }} />
        );
      })}
    </View>
  );
};

// Gold Frame wrapper — uses actual gold frame image
// Gold Frame — gradient metallic gold border with gleam
const GoldFrame = ({ children, style, containerStyle, onPress, thickness = 4 }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={[{
      borderRadius: 6,
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 8,
    }, containerStyle]}>
      {/* Outer gradient — diagonal metallic sweep */}
      <LinearGradient
        colors={['#FFF8DC', '#FFD700', '#B8860B', '#FFD700', '#FFFACD', '#DAA520', '#B8860B', '#FFD700', '#FFF8DC']}
        locations={[0, 0.12, 0.25, 0.4, 0.5, 0.6, 0.75, 0.88, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 6, padding: thickness }}
      >
        {/* Inner thin bright line */}
        <View style={{
          borderRadius: 3,
          borderWidth: 0.5,
          borderColor: 'rgba(255, 248, 220, 0.5)',
        }}>
          <View style={[{ borderRadius: 3, overflow: 'hidden' }, style]}>
            {children}
          </View>
        </View>
      </LinearGradient>
    </Wrapper>
  );
};

// Heart Component
const Heart = ({ size = 24, filled = false, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Text style={{ fontSize: size }}>
      {filled ? '❤️' : '🤍'}
    </Text>
  </TouchableOpacity>
);

// Gold arrow image
const goldArrowImage = require('../Cliparts/Gold arrow.jpg');

// Candle component — lights up when clicked
const Candle = ({ lit = false, onPress, size = 40 }) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center' }}>
    {/* Flame — only visible when lit */}
    {lit && (
      <View style={{
        width: size * 0.3,
        height: size * 0.4,
        borderRadius: size * 0.15,
        backgroundColor: '#FF8C00',
        marginBottom: -4,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 12,
        transform: [{ scaleX: 0.7 }],
      }}>
        <View style={{
          width: size * 0.15,
          height: size * 0.2,
          borderRadius: size * 0.1,
          backgroundColor: '#FFFF00',
          alignSelf: 'center',
          marginTop: size * 0.08,
        }} />
      </View>
    )}
    {!lit && <View style={{ height: size * 0.4 - 4 }} />}
    {/* Wick */}
    <View style={{
      width: 2,
      height: size * 0.15,
      backgroundColor: lit ? '#333' : '#666',
      marginBottom: -1,
    }} />
    {/* Candle body */}
    <View style={{
      width: size * 0.35,
      height: size * 0.5,
      backgroundColor: lit ? '#FFF8DC' : '#8B8682',
      borderRadius: 3,
      borderWidth: 1,
      borderColor: lit ? '#FFD700' : '#555',
      shadowColor: lit ? '#FFD700' : 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: lit ? 0.8 : 0,
      shadowRadius: 8,
    }} />
  </TouchableOpacity>
);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getDateString = (date) => date.toISOString().split('T')[0];

// Check if a specific date had ANY activity
const checkDayActivity = async (dateStr, publicArtworks) => {
  const manifestRaw = await AsyncStorage.getItem(`manifest_${dateStr}`);
  const ranked = await AsyncStorage.getItem(`ranked_${dateStr}`);
  const hasCourage = publicArtworks.some(a => a.date === dateStr);
  return !!(manifestRaw || ranked === 'true' || hasCourage);
};

// Calculate streak: consecutive days of activity ending today (or yesterday if today not started)
const calculateStreak = async () => {
  const publicArtworksRaw = await AsyncStorage.getItem('public_artworks');
  const publicArtworks = publicArtworksRaw ? JSON.parse(publicArtworksRaw) : [];

  let streak = 0;
  const today = new Date();

  // Check going backwards from today
  for (let i = 0; i < 3650; i++) { // max ~10 years
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = getDateString(checkDate);
    const hadActivity = await checkDayActivity(dateStr, publicArtworks);

    if (hadActivity) {
      streak++;
    } else {
      // If today has no activity yet, don't break — check yesterday
      if (i === 0) continue;
      break;
    }
  }

  return streak;
};

// From streak count, calculate earned stars
// Each day = 1 five-pointed star. Every 7 days consolidate into 1 seven-pointed star.
// Every 30 days consolidate into 1 month star.
// Every 365 days → year dot.
const getStreakStars = (streak) => {
  let remaining = streak;

  // Year dots: every 365 days
  const yearDots = Math.floor(remaining / 365);
  remaining = remaining % 365;

  // Month stars: every 30 days
  const monthStars = Math.floor(remaining / 30);
  remaining = remaining % 30;

  // Week stars: every 7 days
  const weekStars = Math.floor(remaining / 7);

  // Remaining individual day stars (not yet a full week)
  const dayStars = remaining % 7;

  return { yearDots, monthStars, weekStars, dayStars, total: streak };
};

// Get today's MAGIC task completion
const getTodaysTasks = async () => {
  const today = getDateString(new Date());
  const publicArtworksRaw = await AsyncStorage.getItem('public_artworks');
  const publicArtworks = publicArtworksRaw ? JSON.parse(publicArtworksRaw) : [];
  const weeklyArtTime = await AsyncStorage.getItem('weekly_art_time');

  const manifestRaw = await AsyncStorage.getItem(`manifest_${today}`);
  let hasGoal = false;
  if (manifestRaw) {
    try {
      const entry = JSON.parse(manifestRaw);
      hasGoal = !!(entry.growthGoal && entry.growthGoal.trim());
    } catch (e) {}
  }

  return {
    manifest: !!manifestRaw,
    art: !!(weeklyArtTime && parseInt(weeklyArtTime) > 0),
    goal: hasGoal,
    inspire: (await AsyncStorage.getItem(`ranked_${today}`)) === 'true',
    courage: publicArtworks.some(a => a.date === today),
  };
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HomeScreen({ navigation }) {
  const [goalAcknowledged, setGoalAcknowledged] = useState(false);
  const [goalMetYes, setGoalMetYes] = useState(false); // true = yes, false = no/not yet
  const [yesterdayGoal, setYesterdayGoal] = useState('');
  const [todayGoal, setTodayGoal] = useState('');
  const [quoteHearted, setQuoteHearted] = useState(false);
  const [savedArtworks, setSavedArtworks] = useState(new Set());
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [todayQuote, setTodayQuote] = useState({ quote: '', author: '' });
  const [todaysChallenge, setTodaysChallenge] = useState('');
  const [todaysCriterion, setTodaysCriterion] = useState('');
  const [pseudonym, setPseudonym] = useState('PSEUDONYM');

  // Streak state
  const [streakData, setStreakData] = useState({ yearDots: 0, monthStars: 0, weekStars: 0, dayStars: 0, total: 0 });
  const [realStreakData, setRealStreakData] = useState(null);
  const [todayTasks, setTodayTasks] = useState({ manifest: false, art: false, goal: false, inspire: false, courage: false });
  const [previewIndex, setPreviewIndex] = useState(-1); // -1 = real data

  useEffect(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const quoteIndex = dayOfYear % quotesData.length;
    setTodayQuote(quotesData[quoteIndex]);

    loadTodaysChallenge();
    loadTodaysCriterion();
    loadPseudonym();
    loadStreakData();
    loadGoals();
    loadSavedArtworks();
  }, []);

  const loadTodaysChallenge = async () => {
    try {
      const challenge = await AsyncStorage.getItem('todays_challenge');
      if (challenge) setTodaysChallenge(challenge);
    } catch (error) {
      console.log('Error loading challenge:', error);
    }
  };

  const loadTodaysCriterion = async () => {
    try {
      const criterion = await AsyncStorage.getItem('todays_criterion');
      if (criterion) setTodaysCriterion(criterion);
    } catch (error) {
      console.log('Error loading criterion:', error);
    }
  };

  const loadPseudonym = async () => {
    try {
      const profile = await AsyncStorage.getItem('user_profile');
      if (profile) {
        const parsed = JSON.parse(profile);
        if (parsed.username) setPseudonym(parsed.username);
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const today = new Date();
      const todayStr = getDateString(today);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = getDateString(yesterday);

      // Check if already acknowledged today
      const ack = await AsyncStorage.getItem(`goal_acknowledged_${todayStr}`);
      if (ack) {
        setGoalAcknowledged(true);
        setGoalMetYes(ack === 'yes');
      }

      // Load yesterday's goal
      const yesterdayManifest = await AsyncStorage.getItem(`manifest_${yesterdayStr}`);
      if (yesterdayManifest) {
        try {
          const parsed = JSON.parse(yesterdayManifest);
          if (parsed.growthGoal && parsed.growthGoal.trim()) {
            setYesterdayGoal(parsed.growthGoal.trim());
          }
        } catch (e) {}
      }

      // Load today's goal
      const todayManifest = await AsyncStorage.getItem(`manifest_${todayStr}`);
      if (todayManifest) {
        try {
          const parsed = JSON.parse(todayManifest);
          if (parsed.growthGoal && parsed.growthGoal.trim()) {
            setTodayGoal(parsed.growthGoal.trim());
          }
        } catch (e) {}
      }
    } catch (error) {
      console.log('Error loading goals:', error);
    }
  };

  const handleGoalHeart = async () => {
    const todayStr = getDateString(new Date());
    if (!goalAcknowledged) {
      // First click = yes, met the goal
      setGoalAcknowledged(true);
      setGoalMetYes(true);
      await AsyncStorage.setItem(`goal_acknowledged_${todayStr}`, 'yes');
    } else if (goalMetYes) {
      // Second click = no, didn't meet it
      setGoalMetYes(false);
      await AsyncStorage.setItem(`goal_acknowledged_${todayStr}`, 'no');
    } else {
      // Third click = back to yes
      setGoalMetYes(true);
      await AsyncStorage.setItem(`goal_acknowledged_${todayStr}`, 'yes');
    }
  };

  // Save currently displayed artwork to personal archive on Connect page
  const loadSavedArtworks = async () => {
    try {
      const existingRaw = await AsyncStorage.getItem('favorite_artworks');
      if (existingRaw) {
        const existing = JSON.parse(existingRaw);
        const indices = new Set(existing.map(a => a.index));
        setSavedArtworks(indices);
      }
    } catch (error) {
      console.log('Error loading saved artworks:', error);
    }
  };

  const handleFavoriteArtwork = async () => {
    try {
      const existingRaw = await AsyncStorage.getItem('favorite_artworks');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];

      if (savedArtworks.has(currentImageIndex)) {
        // Remove from favorites
        const filtered = existing.filter(a => a.index !== currentImageIndex);
        await AsyncStorage.setItem('favorite_artworks', JSON.stringify(filtered));
        setSavedArtworks(prev => {
          const next = new Set(prev);
          next.delete(currentImageIndex);
          return next;
        });
      } else {
        // Add to favorites
        const artwork = {
          id: `fav_${Date.now()}`,
          index: currentImageIndex,
          title: `Artwork ${currentImageIndex + 1}`,
          source: 'home',
          date: getDateString(new Date()),
          savedAt: new Date().toISOString(),
        };
        existing.push(artwork);
        await AsyncStorage.setItem('favorite_artworks', JSON.stringify(existing));
        setSavedArtworks(prev => new Set([...prev, currentImageIndex]));
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
    }
  };

  const loadStreakData = async () => {
    try {
      const streak = await calculateStreak();
      const data = getStreakStars(streak);
      setStreakData(data);
      setRealStreakData(data);
      const tasks = await getTodaysTasks();
      setTodayTasks(tasks);
    } catch (error) {
      console.log('Error loading streak:', error);
    }
  };

  // Preview mode: tap streak count to cycle through demo streaks
  const PREVIEW_STREAKS = [10, 45, 200, 400, 800]; // days
  const togglePreview = () => {
    const nextIndex = previewIndex + 1;
    if (nextIndex >= PREVIEW_STREAKS.length) {
      // Back to real data
      setPreviewIndex(-1);
      if (realStreakData) setStreakData(realStreakData);
      setTodayTasks(prev => prev); // keep real tasks
    } else {
      setPreviewIndex(nextIndex);
      const demoStreak = PREVIEW_STREAKS[nextIndex];
      setStreakData(getStreakStars(demoStreak));
      // Show all tasks complete in preview
      setTodayTasks({ manifest: true, art: true, goal: true, inspire: true, courage: true });
    }
  };

  // Build the arrow: all earned items from smallest (bottom-left) to biggest (top-right)
  // Order: year dots → month stars → week stars → past day stars → TODAY's big MAGIC star
  const buildArrowItems = () => {
    const items = [];

    // Year dots (smallest, furthest back)
    for (let i = 0; i < streakData.yearDots; i++) {
      items.push({ type: 'year', key: `year-${i}` });
    }
    // Month stars
    for (let i = 0; i < streakData.monthStars; i++) {
      items.push({ type: 'month', key: `month-${i}` });
    }
    // Week stars (consolidated 7-day blocks)
    for (let i = 0; i < streakData.weekStars; i++) {
      items.push({ type: 'week', key: `week-${i}` });
    }
    // Individual past day stars (days not yet consolidated into a week)
    // dayStars count excludes today (today is the MAGIC star)
    const pastDays = Math.max(0, (streakData.dayStars || 0) - 1);
    for (let i = 0; i < pastDays; i++) {
      items.push({ type: 'day', key: `day-${i}` });
    }
    // Today's big MAGIC star is always last (the arrow point)
    items.push({ type: 'magic', key: 'today' });

    return items;
  };

  const arrowItems = buildArrowItems();

  // Calculate gentle upward curve: each item gets a marginBottom offset
  // Items go bottom-left to top-right
  const getItemOffset = (index, total) => {
    // Gentle rise: earlier items lower, later items higher
    const progress = total > 1 ? index / (total - 1) : 1;
    return Math.round(progress * -30); // max 30px rise
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Header with Menu Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Home</Text>
          <View style={styles.menuButtonPlaceholder} />
        </View>

        {/* ===== STREAK STAR ARROW ===== */}
        <View style={styles.starSection}>
          <View style={styles.arrowContainer}>
            {arrowItems.map((item, index) => (
              <View
                key={item.key}
                style={{
                  marginTop: getItemOffset(index, arrowItems.length),
                  justifyContent: 'flex-end',
                }}
              >
                {item.type === 'year' && <YearDot size={7} />}
                {item.type === 'month' && <MonthStar size={20} />}
                {item.type === 'week' && <WeekStar size={28} />}
                {item.type === 'day' && <DayStar size={32} />}
                {item.type === 'magic' && <MagicStar tasks={todayTasks} size={52} />}
              </View>
            ))}
          </View>

          {/* Streak count — tap to preview different streak levels */}
          <TouchableOpacity onPress={togglePreview}>
            <Text style={styles.streakCount}>
              {previewIndex >= 0
                ? `Preview: ${PREVIEW_STREAKS[previewIndex]} day streak (tap to cycle)`
                : streakData.total > 0
                  ? `${streakData.total} day streak`
                  : 'Start your streak today!'
              }
            </Text>
            {previewIndex === -1 && (
              <Text style={styles.previewHint}>tap to preview</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.tagline}>
          Reach for a star everyday, {pseudonym}
        </Text>

        <View style={styles.divider} />

        {/* Quote & Goal side by side */}
        <View style={styles.cardRow}>
          {/* Quote Box - Clickable to Manifest */}
          <GoldFrame
            style={styles.purpleCard}
            containerStyle={styles.cardHalf}
            onPress={() => navigation.navigate('Manifest')}
          >
            <View style={styles.cardInnerCompact}>
              <Text style={styles.quoteTextSmall}>"{todayQuote.quote}"</Text>
              <Text style={styles.authorText}>~{todayQuote.author}</Text>
              <Text style={styles.manifestTextSmall}>
                <Text style={styles.manifestHighlight}>Manifest?</Text> tap here
              </Text>
              <View style={styles.heartRightSmall}>
                <Heart
                  size={24}
                  filled={quoteHearted}
                  onPress={() => setQuoteHearted(!quoteHearted)}
                />
              </View>
            </View>
          </GoldFrame>

          {/* Goal Box - Clickable to Manifest */}
          <GoldFrame
            style={styles.redCard}
            containerStyle={styles.cardHalf}
            onPress={() => navigation.navigate('Manifest')}
          >
            <View style={styles.cardInnerCompact}>
              <Text style={styles.goalTitleSmall}>Yesterday's grow goal?</Text>
              <Text style={styles.goalSubtextSmall}>
                heart = yes, twice = no
              </Text>

              {!goalAcknowledged ? (
                <Text style={styles.goalDisplaySmall}>
                  {yesterdayGoal || 'No goal set'}
                </Text>
              ) : (
                <View>
                  <Text style={styles.goalAckText}>
                    {goalMetYes ? 'Great work!' : 'Keep pushing!'}
                  </Text>
                  <Text style={styles.goalLabel}>Today's Goal:</Text>
                  <Text style={styles.goalDisplaySmall}>
                    {todayGoal || 'Set goal on Manifest'}
                  </Text>
                </View>
              )}

              <View style={styles.heartRightSmall}>
                <Heart
                  size={24}
                  filled={goalMetYes && goalAcknowledged}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleGoalHeart();
                  }}
                />
              </View>
            </View>
          </GoldFrame>
        </View>

        {/* Art Challenge Box - Center third, double frame */}
        <View style={styles.artBoxRow}>
          <GoldFrame
            containerStyle={styles.artBoxOuter}
            onPress={() => navigation.navigate('Art')}
          >
            <View style={styles.artFrameGap}>
              <GoldFrame style={styles.artCard} thickness={3}>
                <View style={styles.cardInnerArt}>
                  <Text style={styles.artLabel}>Art:</Text>
                  <Text style={styles.artChallenge}>{todaysChallenge || 'Loading...'}</Text>
                </View>
              </GoldFrame>
            </View>
          </GoldFrame>
        </View>

        <View style={styles.divider} />

        {/* Ranking Section - Clickable to Inspire */}
        <TouchableOpacity onPress={() => navigation.navigate('Inspire')}>
          <Text style={styles.rankTitle}>
            Rank by: <Text style={styles.underline}>{todaysCriterion || 'Loading...'}</Text>
          </Text>
        </TouchableOpacity>

        {/* Gallery buttons aligned to art box edges, above artwork */}
        <View style={styles.galleryButtonRow}>
          <View style={styles.galleryButtonLeft}>
            <GoldFrame onPress={() => {}}>
              <View style={styles.galleryButtonInner}>
                <Text style={styles.galleryButtonText}>show winner</Text>
              </View>
            </GoldFrame>
          </View>
          <View style={styles.galleryButtonRight}>
            <GoldFrame onPress={() => {}}>
              <View style={styles.galleryButtonInner}>
                <Text style={styles.galleryButtonText}>show gallery</Text>
              </View>
            </GoldFrame>
          </View>
        </View>

        {/* Artwork display */}
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))} style={styles.arrowButton}>
            <Image source={goldArrowImage} style={[styles.arrowImage, { transform: [{ scaleX: -1 }] }]} resizeMode="contain" />
          </TouchableOpacity>

          <GoldFrame>
            <View style={styles.imageFrameInner}>
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>🎨</Text>
                <Text style={styles.placeholderSubtext}>Artwork {currentImageIndex + 1}</Text>
              </View>
            </View>
          </GoldFrame>

          <TouchableOpacity onPress={() => setCurrentImageIndex(currentImageIndex + 1)} style={styles.arrowButton}>
            <Image source={goldArrowImage} style={styles.arrowImage} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Inspired Section */}
        <View style={styles.inspiredContainer}>
          <GoldFrame onPress={() => {}}>
            <View style={styles.iconButtonInner}>
              <Text style={styles.iconEmoji}>✉️</Text>
            </View>
          </GoldFrame>

          <View style={styles.inspiredTextBlock}>
            <Text style={styles.inspiredText}>Inspired?</Text>
            <Text style={styles.inspiredSubtext}>Save to Inspiration gallery</Text>
            <Text style={styles.inspiredSubtext}>Click candle ›</Text>
          </View>

          <Candle
            lit={savedArtworks.has(currentImageIndex)}
            onPress={() => handleFavoriteArtwork()}
            size={44}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
  },
  menuButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#B8860B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  menuButtonText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  menuButtonPlaceholder: {
    width: 44,
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    flex: 1,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  // Streak arrow layout
  starSection: {
    marginBottom: 10,
    alignItems: 'center',
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 20,
    minHeight: 100,
  },
  streakCount: {
    fontSize: 14,
    color: '#4FC3F7',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  previewHint: {
    fontSize: 10,
    color: '#3a4a6a',
    textAlign: 'center',
    marginTop: 2,
  },
  tagline: {
    fontSize: 18,
    color: '#4FC3F7',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
    marginTop: 10,
  },
  divider: {
    height: 2,
    backgroundColor: '#FFD700',
    marginVertical: 20,
    opacity: 0.5,
  },
  purpleCard: {
    backgroundColor: '#0a0e27',
  },
  redCard: {
    backgroundColor: '#0a0e27',
  },
  artCard: {
    backgroundColor: '#1a1a1a',
  },
  artBoxRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  artBoxOuter: {
    width: '60%',
  },
  artFrameGap: {
    padding: 15,
    backgroundColor: '#0a0e27',
  },
  frameSpacing: {
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  cardHalf: {
    flex: 1,
  },
  cardInner: {
    padding: 20,
    position: 'relative',
  },
  cardInnerCompact: {
    padding: 12,
    position: 'relative',
    minHeight: 140,
  },
  cardInnerArt: {
    padding: 30,
  },
  quoteText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  quoteTextSmall: {
    fontSize: 15,
    color: '#D8BFD8',
    marginBottom: 6,
    lineHeight: 20,
  },
  authorText: {
    fontSize: 13,
    color: '#C8A2C8',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  manifestText: {
    fontSize: 16,
    color: '#4FC3F7',
    fontWeight: '600',
  },
  manifestTextSmall: {
    fontSize: 14,
    color: '#E6E6FA',
    fontWeight: '600',
  },
  manifestHighlight: {
    color: '#FFD700',
  },
  heartRight: {
    position: 'absolute',
    bottom: 15,
    right: 15,
  },
  heartRightSmall: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  goalTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
    marginBottom: 10,
  },
  goalTitleSmall: {
    fontSize: 16,
    color: '#FF8A80',
    fontWeight: '600',
    marginBottom: 4,
  },
  goalSubtext: {
    fontSize: 14,
    color: '#FFCDD2',
    marginBottom: 5,
  },
  goalSubtextSmall: {
    fontSize: 13,
    color: '#F48FB1',
    marginBottom: 4,
  },
  goalDisplay: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    marginTop: 10,
    marginRight: 50,
    lineHeight: 22,
  },
  goalDisplaySmall: {
    fontSize: 14,
    color: '#FFAB91',
    fontWeight: '500',
    marginTop: 6,
    marginRight: 30,
    lineHeight: 19,
  },
  goalAckText: {
    fontSize: 16,
    color: '#FF8A80',
    fontWeight: '600',
    marginTop: 8,
  },
  goalLabel: {
    fontSize: 14,
    color: '#F48FB1',
    marginTop: 8,
    fontWeight: '600',
  },
  bold: {
    fontWeight: 'bold',
  },
  artLabel: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  artChallenge: {
    fontSize: 32,
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rankTitle: {
    fontSize: 22,
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  galleryButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  galleryButtonLeft: {
    width: '20%',
    alignItems: 'flex-end',
  },
  galleryButtonRight: {
    width: '20%',
    alignItems: 'flex-start',
  },
  galleryButtonInner: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  galleryButtonText: {
    color: '#FFE082',
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 20,
  },
  arrowButton: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowImage: {
    width: 50,
    height: 30,
  },
  imageFrameInner: {
    width: 240,
    height: 240,
    backgroundColor: '#1a1a1a',
    padding: 10,
  },
  placeholderImage: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 60,
    marginBottom: 10,
  },
  placeholderSubtext: {
    color: '#FFD700',
    fontSize: 16,
  },
  inspiredContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    gap: 15,
  },
  iconButtonInner: {
    backgroundColor: '#1a1a1a',
    padding: 10,
  },
  iconEmoji: {
    fontSize: 32,
  },
  inspiredTextBlock: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  inspiredText: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  inspiredSubtext: {
    fontSize: 12,
    color: '#87CEEB',
    marginTop: 2,
  },
});

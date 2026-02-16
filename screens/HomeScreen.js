import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
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

// Heart Component
const Heart = ({ size = 24, filled = false, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Text style={{ fontSize: size }}>
      {filled ? '❤️' : '🤍'}
    </Text>
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
  const [goalCompleted, setGoalCompleted] = useState(false);
  const [quoteHearted, setQuoteHearted] = useState(false);
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

        {/* Quote Box - Clickable to Manifest */}
        <TouchableOpacity
          style={[styles.card, styles.purpleCard]}
          onPress={() => navigation.navigate('Manifest')}
        >
          <Text style={styles.quoteText}>"{todayQuote.quote}"</Text>
          <Text style={styles.authorText}>~{todayQuote.author}</Text>
          <Text style={styles.manifestText}>
            Ready to <Text style={styles.manifestHighlight}>Manifest?</Text> click here.
          </Text>
          <View style={styles.heartRight}>
            <Heart
              size={32}
              filled={quoteHearted}
              onPress={() => setQuoteHearted(!quoteHearted)}
            />
          </View>
        </TouchableOpacity>

        {/* Goal Box - Clickable to Manifest */}
        <TouchableOpacity
          style={[styles.card, styles.redCard]}
          onPress={() => navigation.navigate('Manifest')}
        >
          <Text style={styles.goalTitle}>Did you meet yesterday's grow goal?</Text>
          <Text style={styles.goalSubtext}>click heart for yes</Text>
          <Text style={styles.goalSubtext}>
            then replace with today's <Text style={styles.bold}>goal</Text>, no heart
          </Text>
          <View style={styles.heartRight}>
            <Heart
              size={36}
              filled={goalCompleted}
              onPress={(e) => {
                e.stopPropagation();
                setGoalCompleted(!goalCompleted);
              }}
            />
          </View>
        </TouchableOpacity>

        {/* Art Challenge Box - Clickable to Art */}
        <TouchableOpacity
          style={[styles.card, styles.artCard]}
          onPress={() => navigation.navigate('Art')}
        >
          <Text style={styles.artLabel}>Art:</Text>
          <Text style={styles.artChallenge}>{todaysChallenge || 'Loading...'}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Ranking Section - Clickable to Inspire */}
        <TouchableOpacity onPress={() => navigation.navigate('Inspire')}>
          <Text style={styles.rankTitle}>
            Rank by: <Text style={styles.underline}>{todaysCriterion || 'Loading...'}</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.galleryButtons}>
          <TouchableOpacity style={styles.galleryButton}>
            <Text style={styles.galleryButtonText}>show winner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryButton}>
            <Text style={styles.galleryButtonText}>show gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Image Display */}
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>

          <View style={styles.imageFrame}>
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>🎨</Text>
              <Text style={styles.placeholderSubtext}>Artwork {currentImageIndex + 1}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => setCurrentImageIndex(currentImageIndex + 1)}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Inspired Section */}
        <View style={styles.inspiredContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconEmoji}>✉️</Text>
          </TouchableOpacity>

          <View style={styles.inspiredBox}>
            <Text style={styles.inspiredText}>Inspired?</Text>
          </View>

          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconEmoji}>❤️</Text>
          </TouchableOpacity>
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
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
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
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFD700',
    position: 'relative',
  },
  purpleCard: {
    backgroundColor: '#4A148C',
  },
  redCard: {
    backgroundColor: '#B71C1C',
  },
  artCard: {
    backgroundColor: '#1a1a1a',
    padding: 30,
  },
  quoteText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  authorText: {
    fontSize: 12,
    color: '#E1BEE7',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  manifestText: {
    fontSize: 16,
    color: '#4FC3F7',
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
  goalTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
    marginBottom: 10,
  },
  goalSubtext: {
    fontSize: 14,
    color: '#FFCDD2',
    marginBottom: 5,
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
  galleryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  galleryButton: {
    backgroundColor: '#B8860B',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 8,
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
    marginBottom: 20,
  },
  navArrow: {
    fontSize: 48,
    color: '#FFD700',
    paddingHorizontal: 10,
  },
  imageFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
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
  },
  iconButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 15,
  },
  iconEmoji: {
    fontSize: 32,
  },
  inspiredBox: {
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  inspiredText: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: 'bold',
  },
});

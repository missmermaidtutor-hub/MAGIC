import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Image, ImageBackground, Modal } from 'react-native';
import { showAlert, showConfirm } from '../utils/alertUtils';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useAuth } from '../context/AuthContext';
import { calculateAndSetWinner, getRecentWinners, saveProgress } from '../services/firestoreService';
import { getESTDate, getESTYesterday, getESTDayBeforeYesterday, formatDisplayDate } from '../utils/dateUtils';
import quotesData from '../quotes.json';
import { getTodayQuote } from '../utils/quoteUtils';
import { trackAction } from '../services/analyticsService';
import { scheduleStreakReminder } from '../utils/notificationUtils';
import { getTasksForDate } from '../utils/taskUtils';
import { openMailto } from '../utils/emailUtils';

const SCREEN_WIDTH = Dimensions.get('window').width - 40; // minus padding

// MAGIC task constants (shared with insight modal)
const MAGIC_KEYS = ['manifest', 'art', 'goal', 'inspire', 'courage'];
const MAGIC_COLOR_ARRAY = ['#FF2D55', '#FF8C00', '#FFD700', '#34D058', '#8B5CF6'];
const MAGIC_LABELS = ['Manifest', 'Art', 'Grow', 'Inspire', 'Connect'];
const MAGIC_GUIDANCE = [
  'Write in your Muse, Dump, or Vision journal',
  'Use the art timer, create, or upload artwork',
  'Set a growth goal in your Manifest',
  "Vote on today's artwork rankings",
  'Browse curations, send inspiration, or save art',
];

// ============================================================
// STAR COMPONENTS
// ============================================================

// SVG pie-wedge center circle for MAGIC stars
// Draws a circle divided into 5 colored wedges, each aligned with its star point
const StarCenter = ({ size, wedgeColors }) => {
  const r = size / 2;
  const wedgeAngles = [-90, -18, 54, 126, 198]; // MAGIC point angles
  return (
    <Svg width={size} height={size} style={{ position: 'absolute', zIndex: 10 }}>
      {wedgeAngles.map((angle, i) => {
        const startRad = (angle - 36) * Math.PI / 180;
        const endRad = (angle + 36) * Math.PI / 180;
        const x1 = r + r * Math.cos(startRad);
        const y1 = r + r * Math.sin(startRad);
        const x2 = r + r * Math.cos(endRad);
        const y2 = r + r * Math.sin(endRad);
        return (
          <Path
            key={i}
            d={`M ${r} ${r} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
            fill={wedgeColors[i]}
          />
        );
      })}
    </Svg>
  );
};

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
    manifest: tasks.manifest ? '#FF2D55' : '#1a2a4a',
    art:      tasks.art      ? '#FF8C00' : '#1a2a4a',
    goal:     tasks.goal     ? '#FFD700' : '#1a2a4a',
    inspire:  tasks.inspire  ? '#34D058' : '#1a2a4a',
    courage:  tasks.courage  ? '#8B5CF6' : '#1a2a4a',
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
        {/* Radiating gold glow when all complete */}
        {allComplete && (
          <>
            <View style={{
              position: 'absolute',
              width: size + 24,
              height: size + 24,
              borderRadius: (size + 24) / 2,
              backgroundColor: 'rgba(255, 215, 0, 0.15)',
            }} />
            <View style={{
              position: 'absolute',
              width: size + 14,
              height: size + 14,
              borderRadius: (size + 14) / 2,
              backgroundColor: 'rgba(255, 215, 0, 0.35)',
            }} />
          </>
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
        {/* Center circle with pie wedges */}
        <StarCenter
          size={size * 0.32}
          wedgeColors={allComplete
            ? ['#c1a900','#c1a900','#c1a900','#c1a900','#c1a900']
            : [pointColors.manifest, pointColors.art, pointColors.goal, pointColors.inspire, pointColors.courage]
          }

        />
        {/* 5 colored points (on top of gold outline) — all gold when complete */}
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
            borderBottomColor: allComplete ? '#c1a900' : pointColors[key],
            transform: [
              { rotate: `${angle + 90}deg` },
              { translateY: -size * 0.14 },
            ],
            ...(allComplete ? {
              shadowColor: '#FFD700',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
            } : {}),
          }} />
        ))}
      </View>
      {/* MAGIC labels under star */}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {['M', 'A', 'G', 'I', 'C'].map((letter, i) => {
          const keys = ['manifest', 'art', 'goal', 'inspire', 'courage'];
          const colors = ['#78000E', '#9E4502', '#c1a900', '#3c9820', '#5008a7'];
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
// MAGIC colors for star points (same order as StreakScreen CalendarStar)
const MAGIC_STAR_COLORS = {
  manifest: '#FF2D55',
  art:      '#FF8C00',
  grow:     '#FFD700',
  inspire:  '#34D058',
  connect:  '#8B5CF6',
};

const DayStar = ({ size = 30, tasks = {} }) => {
  const pointAngles = [
    { key: 'manifest', angle: -90 },
    { key: 'art',      angle: -90 + 72 },
    { key: 'goal',     angle: -90 + 144 },
    { key: 'inspire',  angle: -90 + 216 },
    { key: 'courage',  angle: -90 + 288 },
  ];
  const pointColors = {
    manifest: tasks.manifest ? MAGIC_STAR_COLORS.manifest : '#1a2a4a',
    art:      tasks.art      ? MAGIC_STAR_COLORS.art      : '#1a2a4a',
    goal:     tasks.goal     ? MAGIC_STAR_COLORS.grow      : '#1a2a4a',
    inspire:  tasks.inspire  ? MAGIC_STAR_COLORS.inspire   : '#1a2a4a',
    courage:  tasks.courage  ? MAGIC_STAR_COLORS.connect   : '#1a2a4a',
  };
  const allComplete = tasks.manifest && tasks.art && tasks.goal && tasks.inspire && tasks.courage;

  return (
    <View style={{ width: size + 4, height: size + 4, margin: 3, justifyContent: 'center', alignItems: 'center' }}>
      {allComplete && (
        <View style={{
          position: 'absolute',
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          backgroundColor: 'rgba(255, 215, 0, 0.35)',
        }} />
      )}
      {/* Gold outline */}
      {pointAngles.map(({ key, angle }) => (
        <View key={`o-${key}`} style={{
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
      ))}
      {/* Center circle — per-task colors or all gold */}
      <StarCenter
        size={size * 0.28}
        wedgeColors={allComplete
          ? ['#c1a900','#c1a900','#c1a900','#c1a900','#c1a900']
          : [pointColors.manifest, pointColors.art, pointColors.goal, pointColors.inspire, pointColors.courage]
        }
      />
      {/* Filled points — per-task colors or all gold */}
      {pointAngles.map(({ key, angle }) => (
        <View key={key} style={{
          position: 'absolute',
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.1,
          borderRightWidth: size * 0.1,
          borderBottomWidth: size * 0.38,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: allComplete ? '#c1a900' : pointColors[key],
          transform: [
            { rotate: `${angle + 90}deg` },
            { translateY: -size * 0.13 },
          ],
        }} />
      ))}
    </View>
  );
};

// Gold Frame wrapper — uses actual gold frame image
// Gold Frame — gradient metallic gold border with gleam
const GoldFrame = ({ children, style, containerStyle, onPress, thickness = 4, borderColor: outerBorderColor }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={[{
      borderRadius: outerBorderColor ? 11 : 6,
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 8,
      backgroundColor: 'transparent',
      ...(outerBorderColor ? { borderWidth: 5, borderColor: outerBorderColor } : {}),
    }, containerStyle]}>
      {/* Outer gradient — diagonal metallic sweep */}
      <LinearGradient
        colors={['#FFF8DC', '#FFD700', '#B8860B', '#FFD700', '#FFFACD', '#DAA520', '#B8860B', '#FFD700', '#FFF8DC']}
        locations={[0, 0.12, 0.25, 0.4, 0.5, 0.6, 0.75, 0.88, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: outerBorderColor ? 6 : 6, padding: thickness }}
      >
        {/* Inner gold border line */}
        <View style={{
          borderRadius: 3,
          borderWidth: 1.5,
          borderColor: '#DAA520',
        }}>
          <View style={[{ borderRadius: 2, overflow: 'hidden', backgroundColor: 'transparent' }, style]}>
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

// Check if a specific date had ANY MAGIC activity (matches Grow calendar criteria)
// Check if there was ANY MAGIC activity on a given date (for streak calculation)
// Uses the shared getTasksForDate so streak criteria matches star criteria exactly
const checkDayActivity = async (dateStr) => {
  const tasks = await getTasksForDate(dateStr);
  return tasks.manifest || tasks.art || tasks.goal || tasks.inspire || tasks.courage;
};

// Calculate streak: consecutive days of activity ending today (or yesterday if today not started)
const calculateStreak = async () => {
  let streak = 0;
  const now = new Date();

  // Check going backwards from today using Eastern Time dates
  for (let i = 0; i < 3650; i++) { // max ~10 years
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() - i);
    const dateStr = getESTDate(checkDate);
    const hadActivity = await checkDayActivity(dateStr);

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

// getTasksForDate is now shared — imported from utils/taskUtils.js

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HomeScreen({ navigation }) {
  const { user, userProfile, refreshProfile, resendVerification, checkEmailVerified, checkStreakTrial } = useAuth();
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [goalAcknowledged, setGoalAcknowledged] = useState(false);
  const [goalMetYes, setGoalMetYes] = useState(false); // true = yes, false = no/not yet
  const [goalLocked, setGoalLocked] = useState(false);
  const [showKeepGoalPrompt, setShowKeepGoalPrompt] = useState(false);
  const [yesterdayGoal, setYesterdayGoal] = useState('');
  const [todayGoal, setTodayGoal] = useState('');
  const [quoteHearted, setQuoteHearted] = useState(false); // synced with hearted_quotes in AsyncStorage
  const goalLockTimerRef = useRef(null);
  const [savedArtworks, setSavedArtworks] = useState(new Set());
  const [winners, setWinners] = useState([]);
  const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0);
  const [winnerSound, setWinnerSound] = useState(null);
  const [isPlayingWinner, setIsPlayingWinner] = useState(false);
  const [todayQuote, setTodayQuote] = useState({ quote: '', author: '' });
  const [todaysChallenge, setTodaysChallenge] = useState('');
  const [todaysCriterion, setTodaysCriterion] = useState('');
  const [pseudonym, setPseudonym] = useState('PSEUDONYM');

  // Streak state
  const [streakData, setStreakData] = useState({ yearDots: 0, monthStars: 0, weekStars: 0, dayStars: 0, total: 0 });
  const [realStreakData, setRealStreakData] = useState(null);
  const [todayTasks, setTodayTasks] = useState({ manifest: false, art: false, goal: false, inspire: false, courage: false });
  const [previewIndex, setPreviewIndex] = useState(-1); // -1 = real data
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [isShowingYesterday, setIsShowingYesterday] = useState(false);
  const [pastDayTasks, setPastDayTasks] = useState([]); // task data for past streak days

  const refreshQuote = useCallback(async () => {
    const quote = await getTodayQuote(quotesData);
    setTodayQuote(quote);
  }, []);

  useEffect(() => {
    refreshQuote();
    loadTodaysChallenge();
    loadTodaysCriterion();
    loadPseudonym();
    loadStreakData();
    loadGoals();
    loadSavedArtworks();
    loadQuoteHeartedState();
    loadWinners();
  }, []);

  // Re-sync pseudonym when userProfile updates
  useEffect(() => {
    if (userProfile?.pseudonym) {
      setPseudonym(userProfile.pseudonym);
    }
  }, [userProfile]);

  // First-time login prompt — nudge new users to complete their profile settings (once only)
  const profilePromptShown = useRef(false);
  useEffect(() => {
    if (profilePromptShown.current || !userProfile) return;
    const isIncomplete = !userProfile.pseudonym || !userProfile.birthdate || !userProfile.timezone;
    if (!isIncomplete) return;
    // Only show once — check AsyncStorage
    AsyncStorage.getItem('profile_prompt_dismissed').then(dismissed => {
      if (dismissed === 'true' || profilePromptShown.current) return;
      profilePromptShown.current = true;
      AsyncStorage.setItem('profile_prompt_dismissed', 'true');
      showConfirm(
        'Complete Your Profile',
        'Welcome to MAGIC! Set up your pseudonym, birthdate, and preferences to get the most out of your creative journey.',
        () => navigation.navigate('AboutYou'),
        'Go to Settings'
      );
    });
  }, [userProfile]);

  // Reload quote, hearted state, star data, pseudonym, and winners every time this screen gets focus
  useFocusEffect(
    useCallback(() => {
      refreshQuote();
      loadQuoteHeartedState();
      loadStreakData();
      loadPseudonym();
      refreshProfile();
      loadWinners();
      loadTodaysChallenge();
      // Refresh email verification status so banner hides after user verifies
      if (user && !user.emailVerified) checkEmailVerified();
    }, [todayQuote, userProfile])
  );

  // Cleanup winner audio on unmount
  useEffect(() => {
    return () => {
      if (winnerSound) {
        winnerSound.unloadAsync();
      }
    };
  }, [winnerSound]);

  const loadQuoteHeartedState = async () => {
    try {
      const raw = await AsyncStorage.getItem('hearted_quotes');
      if (raw && todayQuote.quote) {
        const saved = JSON.parse(raw);
        setQuoteHearted(saved.some(q => q.quote === todayQuote.quote));
      } else {
        setQuoteHearted(false);
      }
    } catch (error) {
      console.log('Error loading hearted state:', error);
    }
  };

  const toggleQuoteHeart = async () => {
    try {
      const raw = await AsyncStorage.getItem('hearted_quotes');
      let saved = raw ? JSON.parse(raw) : [];
      const exists = saved.some(q => q.quote === todayQuote.quote);

      if (exists) {
        saved = saved.filter(q => q.quote !== todayQuote.quote);
        trackAction('quote_unhearted');
      } else {
        saved.push({ ...todayQuote, heartedAt: new Date().toISOString() });
        trackAction('quote_hearted');
      }

      await AsyncStorage.setItem('hearted_quotes', JSON.stringify(saved));
      setQuoteHearted(!exists);
    } catch (error) {
      console.log('Error toggling quote heart:', error);
    }
  };

  const loadTodaysChallenge = async () => {
    try {
      // Read from local cache (set by ArtScreen or this screen)
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
      // 1. Prefer context pseudonym from Firestore
      if (userProfile?.pseudonym) {
        setPseudonym(userProfile.pseudonym);
        return;
      }
      // 2. Try cached Firestore profile
      const cached = await AsyncStorage.getItem('cached_user_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.pseudonym) {
          setPseudonym(parsed.pseudonym);
          return;
        }
      }
      // 3. Try user_profile (set during signup)
      const profile = await AsyncStorage.getItem('user_profile');
      if (profile) {
        const parsed = JSON.parse(profile);
        if (parsed.username) {
          setPseudonym(parsed.username);
          return;
        }
      }
      // 4. Try app_settings
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.username) {
          setPseudonym(parsed.username);
          return;
        }
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const todayStr = getESTDate();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getESTDate(yesterday);

      // Check if already acknowledged today
      const ack = await AsyncStorage.getItem(`goal_acknowledged_${todayStr}`);
      if (ack) {
        setGoalAcknowledged(true);
        setGoalLocked(true); // already answered today — lock it
        if (ack === 'yes') {
          setGoalMetYes(true);
        } else if (ack === 'no') {
          setGoalMetYes(false);
          // Check if they already chose to keep the goal
          const keptGoal = await AsyncStorage.getItem(`goal_kept_${todayStr}`);
          if (keptGoal) {
            setShowKeepGoalPrompt(false);
          } else {
            setShowKeepGoalPrompt(true);
          }
        }
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

  // Track which date the goal state was loaded for
  const goalDateRef = useRef(getESTDate());

  // Reset goal state if the date has changed (handles midnight + app reopen)
  const checkGoalDateReset = () => {
    const currentDate = getESTDate();
    if (goalDateRef.current !== currentDate) {
      goalDateRef.current = currentDate;
      setGoalAcknowledged(false);
      setGoalMetYes(false);
      setGoalLocked(false);
      setShowKeepGoalPrompt(false);
      loadGoals();
    }
  };

  // Check on every focus (covers app reopen, tab switch after midnight)
  useFocusEffect(
    useCallback(() => {
      checkGoalDateReset();
    }, [])
  );

  // Also schedule a timer for midnight while the app is open
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const midnightTimer = setTimeout(() => {
      checkGoalDateReset();
    }, msUntilMidnight);

    return () => {
      clearTimeout(midnightTimer);
      if (goalLockTimerRef.current) clearTimeout(goalLockTimerRef.current);
    };
  }, []);

  const startLockTimer = () => {
    if (goalLockTimerRef.current) clearTimeout(goalLockTimerRef.current);
    goalLockTimerRef.current = setTimeout(() => {
      setGoalLocked(true);
    }, 30000); // lock after 30 seconds
  };

  const handleGoalHeart = async () => {
    if (goalLocked) return; // heart is locked

    const todayStr = getESTDate();
    if (!goalAcknowledged) {
      // First click = yes, met the goal
      setGoalAcknowledged(true);
      setGoalMetYes(true);
      await AsyncStorage.setItem(`goal_acknowledged_${todayStr}`, 'yes');
      startLockTimer();
    } else if (goalMetYes) {
      // Second click = no, didn't meet it
      setGoalMetYes(false);
      setShowKeepGoalPrompt(true);
      await AsyncStorage.setItem(`goal_acknowledged_${todayStr}`, 'no');
      startLockTimer();
    } else {
      // Third click = back to yes
      setGoalMetYes(true);
      setShowKeepGoalPrompt(false);
      await AsyncStorage.setItem(`goal_acknowledged_${todayStr}`, 'yes');
      startLockTimer();
    }
  };

  const handleKeepGoal = async (keepIt) => {
    const todayStr = getESTDate();
    await AsyncStorage.setItem(`goal_kept_${todayStr}`, keepIt ? 'yes' : 'no');
    setShowKeepGoalPrompt(false);

    if (keepIt && yesterdayGoal) {
      // Set yesterday's goal as today's goal
      const todayManifestRaw = await AsyncStorage.getItem(`manifest_${todayStr}`);
      const todayManifest = todayManifestRaw ? JSON.parse(todayManifestRaw) : {};
      todayManifest.growthGoal = yesterdayGoal;
      await AsyncStorage.setItem(`manifest_${todayStr}`, JSON.stringify(todayManifest));
      setTodayGoal(yesterdayGoal);
    } else if (!keepIt) {
      // Navigate to Manifest to set a new goal
      navigation.navigate('Manifest');
    }
  };

  // Load saved/favorited winner artworks (by courageId)
  const loadSavedArtworks = async () => {
    try {
      const existingRaw = await AsyncStorage.getItem('favorite_artworks');
      if (existingRaw) {
        const existing = JSON.parse(existingRaw);
        const ids = new Set(existing.map(a => a.courageId).filter(Boolean));
        setSavedArtworks(ids);
      }
    } catch (error) {
      console.log('Error loading saved artworks:', error);
    }
  };

  const handleFavoriteArtwork = async () => {
    const currentWinner = winners[currentWinnerIndex];
    if (!currentWinner) return;

    try {
      const existingRaw = await AsyncStorage.getItem('favorite_artworks');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];

      if (savedArtworks.has(currentWinner.courageId)) {
        // Remove from favorites
        const filtered = existing.filter(a => a.courageId !== currentWinner.courageId);
        await AsyncStorage.setItem('favorite_artworks', JSON.stringify(filtered));
        setSavedArtworks(prev => {
          const next = new Set(prev);
          next.delete(currentWinner.courageId);
          return next;
        });
      } else {
        // Add to favorites
        const artwork = {
          id: `fav_${Date.now()}`,
          courageId: currentWinner.courageId,
          title: currentWinner.title || 'Untitled',
          pseudonym: currentWinner.anonymous ? 'Anonymous' : (currentWinner.pseudonym || 'Anonymous'),
          mediaType: currentWinner.mediaType,
          mediaUrl: currentWinner.mediaUrl,
          winnerDate: currentWinner.date,
          source: 'home',
          date: getESTDate(),
          savedAt: new Date().toISOString(),
        };
        existing.push(artwork);
        await AsyncStorage.setItem('favorite_artworks', JSON.stringify(existing));
        setSavedArtworks(prev => new Set([...prev, currentWinner.courageId]));
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
    }
  };

  // Load winners from Firestore
  const loadWinners = async () => {
    try {
      // Calculate winner from 2 days ago (Day N courages voted on Day N+1, winner shown Day N+2)
      const twoDaysAgo = getESTDayBeforeYesterday();
      await calculateAndSetWinner(twoDaysAgo);

      // Fetch recent winners for browsing
      const recent = await getRecentWinners(25);
      setWinners(recent);
      if (recent.length > 0 && currentWinnerIndex >= recent.length) {
        setCurrentWinnerIndex(0);
      }
    } catch (error) {
      console.log('Error loading winners:', error);
    }
  };

  // Play/pause audio for audio-type winners
  const playWinnerAudio = async (url) => {
    try {
      if (winnerSound) {
        await winnerSound.unloadAsync();
        setWinnerSound(null);
      }
      if (isPlayingWinner) {
        setIsPlayingWinner(false);
        return;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      setWinnerSound(sound);
      setIsPlayingWinner(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlayingWinner(false);
        }
      });
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing winner audio:', error);
    }
  };

  // Stop audio when switching winners
  const switchWinner = async (newIndex) => {
    if (winnerSound) {
      await winnerSound.unloadAsync();
      setWinnerSound(null);
      setIsPlayingWinner(false);
    }
    setCurrentWinnerIndex(newIndex);
  };

  const loadStreakData = async () => {
    try {
      const streak = await calculateStreak();
      const data = getStreakStars(streak);
      setStreakData(data);
      setRealStreakData(data);

      // Check if streak qualifies for a premium trial (milestones ending in 13)
      if (checkStreakTrial && streak > 0) {
        const trialGranted = await checkStreakTrial(streak);
        if (trialGranted) {
          showAlert('Premium Trial Unlocked!', `Congratulations on your ${streak}-day streak! You've earned a free 13-day premium trial.`);
        }
      }

      const todayStr = getESTDate();

      // Load task data for past streak days (for the day stars in the arrow)
      // dayStars includes today, so past days = dayStars - 1
      const pastDayCount = Math.max(0, (data.dayStars || 0) - 1);
      if (pastDayCount > 0) {
        const pastTasks = [];
        const now = new Date();
        for (let i = 1; i <= pastDayCount; i++) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const dateStr = getESTDate(d);
          const tasks = await getTasksForDate(dateStr);
          pastTasks.push(tasks);
        }
        // Reverse so oldest is first (matches arrow order: oldest → newest)
        setPastDayTasks(pastTasks.reverse());
      } else {
        setPastDayTasks([]);
      }
      const tasks = await getTasksForDate(todayStr);
      const anyDoneToday = tasks.manifest || tasks.art || tasks.goal || tasks.inspire || tasks.courage;

      if (anyDoneToday) {
        setTodayTasks(tasks);
        setIsShowingYesterday(false);
        // User has done tasks today — cancel today's reminder, schedule for tomorrow
        if (userProfile) {
          const tz = userProfile.timezone || 'America/New_York';
          const pref = userProfile.notificationPreference || 'daily';
          scheduleStreakReminder(tz, pref, true);
        }
      } else {
        // No tasks done today — show yesterday's star so it stays gold
        const yesterdayStr = getESTYesterday();
        const yesterdayTasks = await getTasksForDate(yesterdayStr);
        const anyDoneYesterday = yesterdayTasks.manifest || yesterdayTasks.art || yesterdayTasks.goal || yesterdayTasks.inspire || yesterdayTasks.courage;
        if (anyDoneYesterday) {
          setTodayTasks(yesterdayTasks);
          setIsShowingYesterday(true);
        } else {
          setTodayTasks(tasks); // both empty, show today's (empty)
          setIsShowingYesterday(false);
        }
      }

      // Sync progress to Firestore (always use today's actual tasks)
      if (user) {
        saveProgress(user.uid, todayStr, tasks).catch(err =>
          console.log('Firestore progress sync error:', err)
        );
      }
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
      items.push({ type: 'day', key: `day-${i}`, tasks: pastDayTasks[i] || {} });
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
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Header spacer */}
        <View style={styles.headerContainer} />

        {/* Email verification banner — below header spacer so transparent header doesn't block touch */}
        {user && !user.emailVerified && !verifyBannerDismissed && (
          <View style={{ backgroundColor: 'rgba(10, 14, 39, 0.9)', borderWidth: 2, borderColor: '#FFD700', borderRadius: 10, padding: 12, marginHorizontal: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontSize: 13, flex: 1 }}>Verify your email to unlock all features</Text>
            <TouchableOpacity
              disabled={sendingVerification}
              onPress={async () => {
                setSendingVerification(true);
                try {
                  const ok = await resendVerification();
                  showAlert(ok ? 'Email Sent' : 'Error', ok ? 'Check your inbox (and spam folder) for a verification link.' : 'Could not send verification email. Try again later.');
                } catch (e) {
                  showAlert('Error', 'Could not send verification email. Try again later.');
                }
                setSendingVerification(false);
              }}
              style={{ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#B8860B', borderRadius: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{sendingVerification ? 'Sending...' : 'Resend'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVerifyBannerDismissed(true)} style={{ marginLeft: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
              <Text style={{ color: '#ccc', fontSize: 14, fontWeight: 'bold' }}>X</Text>
            </TouchableOpacity>
          </View>
        )}

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
                {item.type === 'day' && <DayStar size={44} tasks={item.tasks} />}
                {item.type === 'magic' && (
                  <TouchableOpacity onPress={() => setShowInsightModal(true)} activeOpacity={0.7}>
                    <MagicStar tasks={todayTasks} size={52} />
                  </TouchableOpacity>
                )}
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

        {/* Quote, Goal, Be Creative — stacked and centered */}
        <View style={styles.stackedCards}>
          {/* Quote Box - Clickable to Manifest */}
          <TouchableOpacity
            style={[styles.stackedCard, styles.openFrame, { borderColor: '#78000E' }]}
            onPress={() => navigation.navigate('Manifest')}
          >
            <View style={styles.goldInnerBorder}>
            <View style={styles.cardInner}>
              <Text style={styles.quoteTextSmall}>"{todayQuote.quote}"</Text>
              <Text style={styles.authorText}>~{todayQuote.author}</Text>
              <Text style={styles.manifestTextSmall}>
                <Text style={styles.manifestHighlight}>Manifest?</Text> tap here
              </Text>
              <View style={styles.heartRightSmall}>
                <Heart
                  size={24}
                  filled={quoteHearted}
                  onPress={() => toggleQuoteHeart()}
                />
              </View>
            </View>
            </View>
          </TouchableOpacity>

          {/* Art Challenge Box */}
          <TouchableOpacity
            style={[styles.stackedCard, styles.openFrame, { borderColor: '#9E4502' }]}
            onPress={() => navigation.navigate('Art')}
          >
            <View style={styles.goldInnerBorder}>
            <View style={styles.cardInner}>
              <Text style={styles.artLabel}>Be Creative:</Text>
              <Text style={styles.artChallenge}>{todaysChallenge || 'Loading...'}</Text>
              <Text style={styles.artStudioLink}>Straight to Art Studio</Text>
            </View>
            </View>
          </TouchableOpacity>

          {/* Goal Box */}
          <View style={[styles.stackedCard, styles.openFrame, { borderColor: '#c1a900' }]}>
            <View style={styles.goldInnerBorder}>
            <View style={styles.cardInner}>
              {!goalAcknowledged ? (
                /* Phase 1: Show yesterday's goal, ask if met */
                <View>
                  <Text style={styles.goalTitleSmall}>Did you meet this goal yesterday?</Text>
                  <Text style={styles.goalDisplaySmall}>
                    {yesterdayGoal || 'No goal set'}
                  </Text>
                  <Text style={styles.goalSubtextSmall}>
                    heart = yes, twice = no
                  </Text>
                </View>
              ) : goalMetYes ? (
                /* Phase 2a: Yes — Great work! Show today's goal */
                <View>
                  <Text style={styles.goalAckText}>Great work!</Text>
                  <Text style={styles.goalLabel}>Today's Goal:</Text>
                  {todayGoal ? (
                    <Text style={styles.goalDisplaySmall}>{todayGoal}</Text>
                  ) : (
                    <TouchableOpacity onPress={() => navigation.navigate('Manifest')}>
                      <Text style={[styles.goalDisplaySmall, styles.underline]}>
                        Tap to set today's goal
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* Phase 2b: No — Keep pushing, offer to reuse goal */
                <View>
                  <Text style={styles.goalAckText}>Keep pushing!</Text>
                  {showKeepGoalPrompt && yesterdayGoal ? (
                    <View>
                      <Text style={styles.goalSubtextSmall}>
                        Would you like this to be your goal again today?
                      </Text>
                      <View style={styles.keepGoalButtons}>
                        <TouchableOpacity
                          style={styles.keepGoalYes}
                          onPress={() => handleKeepGoal(true)}
                        >
                          <Text style={styles.keepGoalYesText}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.keepGoalNo}
                          onPress={() => handleKeepGoal(false)}
                        >
                          <Text style={styles.keepGoalNoText}>No</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.goalLabel}>Today's Goal:</Text>
                      {todayGoal ? (
                        <Text style={styles.goalDisplaySmall}>{todayGoal}</Text>
                      ) : (
                        <TouchableOpacity onPress={() => navigation.navigate('Manifest')}>
                          <Text style={[styles.goalDisplaySmall, styles.underline]}>
                            Tap to set today's goal
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
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
                {goalLocked && (
                  <Text style={styles.lockIcon}>🔒</Text>
                )}
              </View>
            </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Ranking Section - Clickable to Inspire */}
          <TouchableOpacity
            style={[styles.stackedCard, styles.openFrame, { borderColor: '#3c9820', marginBottom: 15, alignSelf: 'center' }]}
            onPress={() => navigation.navigate('Inspire')}
          >
            <View style={styles.goldInnerBorder}>
            <View style={styles.rankBox}>
              <Text style={styles.rankTitle}>
                Be INSPIRED by COURAGE{'\n'}
                <Text style={styles.underline}>Cast Your Vote Here</Text>
              </Text>
            </View>
            </View>
          </TouchableOpacity>

        {/* Gallery buttons aligned to art box edges, above artwork */}
        <View style={styles.galleryButtonRow}>
          <View style={styles.galleryButtonLeft}>
            <GoldFrame onPress={() => switchWinner(0)}>
              <View style={styles.galleryButtonInner}>
                <Text style={styles.galleryButtonText}>Show Current{'\n'}Winner</Text>
              </View>
            </GoldFrame>
          </View>
          <View style={styles.galleryButtonRight}>
            <GoldFrame onPress={() => navigation.navigate('Connect', { gallery: 'private' })}>
              <View style={styles.galleryButtonInner}>
                <Text style={styles.galleryButtonText}>show gallery</Text>
              </View>
            </GoldFrame>
          </View>
        </View>

        {/* Date Winner label centered below buttons */}
        <View style={styles.winnerDateRow}>
          <GoldFrame>
            <View style={styles.winnerDateInner}>
              <Text style={styles.winnerDateText}>
                {winners.length > 0
                  ? `${formatDisplayDate(winners[currentWinnerIndex]?.date)} winner`
                  : 'No winners yet'}
              </Text>
            </View>
          </GoldFrame>
        </View>

        {/* Winner artwork display */}
        <View style={styles.imageContainer}>
          <TouchableOpacity
            onPress={() => winners.length > 1 && switchWinner(Math.min(winners.length - 1, currentWinnerIndex + 1))}
            style={styles.arrowButton}
          >
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>

          <GoldFrame thickness={50}>
            <View style={styles.imageFrameInner}>
              {winners.length === 0 ? (
                <View style={styles.noWinnerPlaceholder}>
                  <Text style={styles.noWinnerText}>Winners will{'\n'}appear here</Text>
                </View>
              ) : winners[currentWinnerIndex]?.mediaType === 'audio' ? (
                <TouchableOpacity
                  style={styles.audioWinnerFrame}
                  onPress={() => playWinnerAudio(winners[currentWinnerIndex]?.mediaUrl)}
                >
                  <Text style={styles.audioPlayIcon}>{isPlayingWinner ? '⏸' : '▶'}</Text>
                  <Text style={styles.audioWinnerTitle}>{winners[currentWinnerIndex]?.title || 'Audio Courage'}</Text>
                </TouchableOpacity>
              ) : (
                <Image
                  source={{ uri: winners[currentWinnerIndex]?.mediaUrl }}
                  style={styles.artworkImage}
                  resizeMode="cover"
                />
              )}
            </View>
          </GoldFrame>

          <TouchableOpacity
            onPress={() => winners.length > 1 && switchWinner(Math.max(0, currentWinnerIndex - 1))}
            style={styles.arrowButton}
          >
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Winner pseudonym */}
        <View style={styles.winnerNameRow}>
          <GoldFrame>
            <View style={styles.winnerNameInner}>
              <Text style={styles.winnerNameText}>
                {winners.length > 0
                  ? (winners[currentWinnerIndex]?.anonymous ? 'Anonymous' : (winners[currentWinnerIndex]?.pseudonym || 'Anonymous'))
                  : '---'}
              </Text>
            </View>
          </GoldFrame>
        </View>

        {/* Inspired Section */}
        <View style={styles.inspiredContainer}>
          <TouchableOpacity onPress={async () => {
            openMailto('Something that inspired me', 'This inspired me to send to you!\n\n[Add your message here]\n\n— Sent from MAGIC Tracker');
            // Mark email sent for Connect star
            await AsyncStorage.setItem(`email_sent_${getESTDate()}`, 'true');
          }}>
            <Text style={styles.iconEmoji}>✉️</Text>
          </TouchableOpacity>

          <View style={styles.inspiredTextBlock}>
            <Text style={styles.inspiredText}>Inspired?</Text>
            <Text style={styles.inspiredSubtext}>Save to Your Inspiration Gallery ›</Text>
            <Text style={styles.inspiredSubtext}>‹ Send Inspiration</Text>
          </View>

          <Candle
            lit={winners.length > 0 && savedArtworks.has(winners[currentWinnerIndex]?.courageId)}
            onPress={() => handleFavoriteArtwork()}
            size={44}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ===== DAILY INSIGHT MODAL ===== */}
      <Modal
        visible={showInsightModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInsightModal(false)}
      >
        <View style={styles.insightOverlay}>
          <View style={styles.insightCard}>
            {(() => {
              const tasks = todayTasks;
              const allComplete = tasks.manifest && tasks.art && tasks.goal && tasks.inspire && tasks.courage;
              const completedCount = MAGIC_KEYS.filter(k => tasks[k]).length;
              const starSize = 90;
              const pointAngles = [
                { key: 'manifest', angle: -90 },
                { key: 'art',      angle: -90 + 72 },
                { key: 'goal',     angle: -90 + 144 },
                { key: 'inspire',  angle: -90 + 216 },
                { key: 'courage',  angle: -90 + 288 },
              ];
              const pointColors = {
                manifest: tasks.manifest ? '#FF2D55' : '#1a2a4a',
                art:      tasks.art      ? '#FF8C00' : '#1a2a4a',
                goal:     tasks.goal     ? '#FFD700' : '#1a2a4a',
                inspire:  tasks.inspire  ? '#34D058' : '#1a2a4a',
                courage:  tasks.courage  ? '#8B5CF6' : '#1a2a4a',
              };

              return (
                <>
                  {/* Header */}
                  <Text style={styles.insightDate}>
                    {isShowingYesterday ? "Yesterday's Star" : "Today's Star"}
                  </Text>

                  {/* Large star */}
                  <View style={{ alignItems: 'center', marginVertical: 16 }}>
                    <View style={{ width: starSize, height: starSize, justifyContent: 'center', alignItems: 'center' }}>
                      {allComplete && (
                        <>
                          <View style={{
                            position: 'absolute',
                            width: starSize + 30, height: starSize + 30,
                            borderRadius: (starSize + 30) / 2,
                            backgroundColor: 'rgba(255, 215, 0, 0.15)',
                          }} />
                          <View style={{
                            position: 'absolute',
                            width: starSize + 18, height: starSize + 18,
                            borderRadius: (starSize + 18) / 2,
                            backgroundColor: 'rgba(255, 215, 0, 0.3)',
                          }} />
                        </>
                      )}
                      {pointAngles.map(({ key, angle }) => (
                        <View key={`o-${key}`} style={{
                          position: 'absolute',
                          width: 0, height: 0,
                          borderLeftWidth: starSize * 0.15,
                          borderRightWidth: starSize * 0.15,
                          borderBottomWidth: starSize * 0.48,
                          borderLeftColor: 'transparent',
                          borderRightColor: 'transparent',
                          borderBottomColor: '#B8860B',
                          transform: [{ rotate: `${angle + 90}deg` }, { translateY: -starSize * 0.155 }],
                        }} />
                      ))}
                      <StarCenter
                        size={starSize * 0.32}
                        wedgeColors={allComplete
                          ? ['#c1a900','#c1a900','#c1a900','#c1a900','#c1a900']
                          : [pointColors.manifest, pointColors.art, pointColors.goal, pointColors.inspire, pointColors.courage]
                        }
                      />
                      {pointAngles.map(({ key, angle }) => (
                        <View key={key} style={{
                          position: 'absolute',
                          width: 0, height: 0,
                          borderLeftWidth: starSize * 0.12,
                          borderRightWidth: starSize * 0.12,
                          borderBottomWidth: starSize * 0.42,
                          borderLeftColor: 'transparent',
                          borderRightColor: 'transparent',
                          borderBottomColor: allComplete ? '#c1a900' : pointColors[key],
                          transform: [{ rotate: `${angle + 90}deg` }, { translateY: -starSize * 0.14 }],
                        }} />
                      ))}
                    </View>

                    {/* MAGIC letters */}
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      {['M', 'A', 'G', 'I', 'C'].map((letter, i) => (
                        <Text key={letter} style={{
                          fontSize: 16, fontWeight: 'bold',
                          color: tasks[MAGIC_KEYS[i]] ? MAGIC_COLOR_ARRAY[i] : '#888',
                          marginHorizontal: 3,
                        }}>{letter}</Text>
                      ))}
                    </View>

                    <Text style={styles.insightProgress}>
                      {completedCount}/5 completed
                    </Text>
                  </View>

                  {/* Guidance list */}
                  <View style={styles.insightGuidance}>
                    {MAGIC_KEYS.map((key, i) => {
                      const done = !!tasks[key];
                      return (
                        <View key={key} style={styles.insightGuidanceRow}>
                          <View style={[styles.insightGuidanceDot, {
                            backgroundColor: done ? MAGIC_COLOR_ARRAY[i] : '#888',
                          }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.insightGuidanceLabel, {
                              color: done ? MAGIC_COLOR_ARRAY[i] : '#ffffff',
                            }]}>
                              {done ? '\u2713 ' : ''}{MAGIC_LABELS[i]}
                            </Text>
                            {!done && (
                              <Text style={styles.insightGuidanceHint}>{MAGIC_GUIDANCE[i]}</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity onPress={() => setShowInsightModal(false)} style={styles.insightClose}>
                    <Text style={styles.insightCloseText}>Close</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </ImageBackground>
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
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#8E0DD3',
    textAlign: 'center',
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
    color: '#143fb8',
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
    color: '#143fb8',
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
    backgroundColor: 'transparent',
  },
  openFrame: {
    borderWidth: 5,
    borderRadius: 11,
    backgroundColor: 'transparent',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  goldInnerBorder: {
    borderWidth: 2,
    borderColor: '#DAA520',
    borderRadius: 6,
    margin: 3,
  },
  manifestBorder: {
    borderWidth: 5,
    borderColor: '#78000E',
    borderRadius: 11,
  },
  redCard: {
    backgroundColor: 'transparent',
  },
  goalBorder: {
    borderWidth: 5,
    borderColor: '#c1a900',
    borderRadius: 11,
  },
  artCard: {
    backgroundColor: 'transparent',
  },
  artBorder: {
    borderWidth: 5,
    borderColor: '#9E4502',
    borderRadius: 11,
    width: '60%',
  },
  artBoxRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  artBoxOuter: {
    width: '100%',
  },
  artFrameGap: {
    padding: 15,
    backgroundColor: 'transparent',
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
  stackedCards: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  stackedCard: {
    width: '75%',
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
    padding: 16,
    paddingVertical: 20,
  },
  quoteText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  quoteTextSmall: {
    fontSize: 15,
    color: '#78000E',
    marginBottom: 6,
    lineHeight: 20,
  },
  authorText: {
    fontSize: 13,
    color: '#78000E',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  manifestText: {
    fontSize: 16,
    color: '#660008',
    fontWeight: '600',
  },
  manifestTextSmall: {
    fontSize: 14,
    color: '#78000E',
    fontWeight: '600',
  },
  manifestHighlight: {
    color: '#78000E',
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
    color: '#c1a900',
    fontWeight: '600',
    marginBottom: 4,
  },
  goalSubtext: {
    fontSize: 14,
    color: '#b4924a',
    marginBottom: 5,
  },
  goalSubtextSmall: {
    fontSize: 13,
    color: '#c1a900',
    marginBottom: 4,
  },
  goalDisplay: {
    fontSize: 16,
    color: '#b4924a',
    fontWeight: '500',
    marginTop: 10,
    marginRight: 50,
    lineHeight: 22,
  },
  goalDisplaySmall: {
    fontSize: 14,
    color: '#c1a900',
    fontWeight: '500',
    marginTop: 6,
    marginRight: 30,
    lineHeight: 19,
  },
  goalAckText: {
    fontSize: 16,
    color: '#c1a900',
    fontWeight: '600',
    marginTop: 8,
  },
  goalLabel: {
    fontSize: 14,
    color: '#c1a900',
    marginTop: 8,
    fontWeight: '600',
  },
  keepGoalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  keepGoalYes: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#061679',
  },
  keepGoalYesText: {
    color: '#061679',
    fontSize: 13,
    fontWeight: '600',
  },
  keepGoalNo: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  keepGoalNoText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
  },
  lockIcon: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  bold: {
    fontWeight: 'bold',
  },
  artLabel: {
    fontSize: 20,
    color: '#9E4502',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  artChallenge: {
    fontSize: 26,
    color: '#9E4502',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  artStudioLink: {
    fontSize: 14,
    color: '#9E4502',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  rankBorder: {
    borderWidth: 5,
    borderColor: '#3c9820',
    borderRadius: 11,
    marginBottom: 15,
  },
  rankBox: {
    backgroundColor: 'transparent',
    padding: 15,
    alignItems: 'center',
  },
  rankTitle: {
    fontSize: 22,
    color: '#3c9820',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
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
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  galleryButtonText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontSize: 14,
    fontWeight: '600',
  },
  winnerDateRow: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 8,
  },
  winnerDateInner: {
    backgroundColor: '#004225',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  winnerDateText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  winnerNameRow: {
    alignItems: 'center',
    marginBottom: 15,
  },
  winnerNameInner: {
    backgroundColor: '#004225',
    paddingHorizontal: 25,
    paddingVertical: 10,
  },
  winnerNameText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 20,
  },
  arrowButton: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 60,
    fontWeight: '900',
    color: '#DAA520',
    textShadowColor: '#B8860B',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  imageFrameInner: {
    width: 240,
    height: 240,
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    overflow: 'hidden',
  },
  artworkImage: {
    width: 240,
    height: 240,
  },
  inspiredContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    gap: 15,
  },
  iconButtonInner: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
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
    color: '#5008a7',
    fontWeight: 'bold',
  },
  inspiredSubtext: {
    fontSize: 12,
    color: '#5008a7',
    marginTop: 2,
  },
  noWinnerPlaceholder: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
  },
  noWinnerText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  audioWinnerFrame: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
  },
  audioPlayIcon: {
    fontSize: 48,
    color: '#1226A1',
    marginBottom: 12,
  },
  audioWinnerTitle: {
    fontSize: 14,
    color: '#061679',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Daily Insight Modal
  insightOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  insightCard: {
    backgroundColor: 'rgba(255, 254, 190, 0.25)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#b18630',
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  insightDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b18630',
    textAlign: 'center',
  },
  insightProgress: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  insightGuidance: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#b18630',
    paddingTop: 12,
  },
  insightGuidanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  insightGuidanceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  insightGuidanceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  insightGuidanceHint: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 2,
    fontStyle: 'italic',
  },
  insightClose: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b18630',
    backgroundColor: 'rgba(255, 254, 190, 0.25)',
  },
  insightCloseText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

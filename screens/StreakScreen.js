import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  ImageBackground,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { getESTDate } from '../utils/dateUtils';
import { getTasksForDate } from '../utils/taskUtils';
import { useAuth } from '../context/AuthContext';
import { getMyArtSaves, getUserWinCount, saveGoal } from '../services/firestoreService';
import { trackAction } from '../services/analyticsService';
import { showAlert, showDestructiveConfirm } from '../utils/alertUtils';
import { useFocusEffect } from '@react-navigation/native';
import PremiumGate from '../components/premium/PremiumGate';

// Heart component (matches HomeScreen)
const Heart = ({ size = 24, filled = false, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Text style={{ fontSize: size }}>
      {filled ? '\u2764\uFE0F' : '\uD83E\uDD0D'}
    </Text>
  </TouchableOpacity>
);

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_ABBR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// MAGIC color constants
const MAGIC_COLORS = {
  manifest: '#FF2D55',  // Bright Pink-Red
  art:      '#FF8C00',  // Bright Orange
  grow:     '#FFD700',  // Bright Gold
  inspire:  '#34D058',  // Bright Green
  connect:  '#8B5CF6',  // Bright Violet
};
const MAGIC_DARK = {
  manifest: '#78000E',
  art:      '#9E4502',
  grow:     '#c1a900',
  inspire:  '#3c9820',
  connect:  '#5008a7',
};
const MAGIC_KEYS = ['manifest', 'art', 'goal', 'inspire', 'courage'];
const MAGIC_COLOR_ARRAY = [MAGIC_COLORS.manifest, MAGIC_COLORS.art, MAGIC_COLORS.grow, MAGIC_COLORS.inspire, MAGIC_COLORS.connect];
const MAGIC_LABELS = ['Manifest', 'Art', 'Grow', 'Inspire', 'Connect'];
const MAGIC_GUIDANCE = [
  'Write in your Muse, Dump, or Vision journal',
  'Use the art timer, create, or upload artwork',
  'Set a growth goal on the Grow page',
  'Rank today\'s community artwork',
  'Browse curations, send inspiration, or save art',
];

// SVG pie-wedge center circle for MAGIC stars
const StarCenter = ({ size, wedgeColors }) => {
  const r = size / 2;
  const wedgeAngles = [-90, -18, 54, 126, 198];
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

// ─── Mini 5-point MAGIC star for calendar cells ───────────────────
const CalendarStar = ({ tasks = {}, size = 14 }) => {
  const pointColors = {
    manifest: tasks.manifest ? MAGIC_COLORS.manifest : '#1a2a4a',
    art:      tasks.art      ? MAGIC_COLORS.art      : '#1a2a4a',
    goal:     tasks.goal     ? MAGIC_COLORS.grow     : '#1a2a4a',
    inspire:  tasks.inspire  ? MAGIC_COLORS.inspire  : '#1a2a4a',
    courage:  tasks.courage  ? MAGIC_COLORS.connect  : '#1a2a4a',
  };

  const pointAngles = [
    { key: 'manifest', angle: -90 },
    { key: 'art',      angle: -90 + 72 },
    { key: 'goal',     angle: -90 + 144 },
    { key: 'inspire',  angle: -90 + 216 },
    { key: 'courage',  angle: -90 + 288 },
  ];

  const allComplete = tasks.manifest && tasks.art && tasks.goal && tasks.inspire && tasks.courage;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {allComplete && (
        <View style={{
          position: 'absolute',
          width: size + 3,
          height: size + 3,
          borderRadius: (size + 3) / 2,
          backgroundColor: 'rgba(255, 215, 0, 0.4)',
        }} />
      )}
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
      {/* Center circle with pie wedges */}
      <StarCenter
        size={size * 0.28}
        wedgeColors={allComplete
          ? ['#c1a900','#c1a900','#c1a900','#c1a900','#c1a900']
          : [pointColors.manifest, pointColors.art, pointColors.goal, pointColors.inspire, pointColors.courage]
        }

      />
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

// ─── Helpers ──────────────────────────────────────────────────────
const getDateString = (date) => getESTDate(date);

const getMonthNameShort = (month) => [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
][month];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const getPrevMonth = (year, month) => {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
};

const getNextMonth = (year, month) => {
  if (month === 11) return { year: year + 1, month: 0 };
  return { year, month: month + 1 };
};

// ─── Load MAGIC tasks for every day in a given month ─────────────
// Uses the shared getTasksForDate so stars match the HomeScreen exactly
const loadMonthData = async (year, month) => {
  const daysInMonth = getDaysInMonth(year, month);
  const dayData = {};

  try {
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = getDateString(new Date(year, month, day));
      const tasks = await getTasksForDate(dateStr);
      const hasAny = tasks.manifest || tasks.art || tasks.goal || tasks.inspire || tasks.courage;

      if (hasAny) {
        dayData[day] = tasks;
      }
    }
  } catch (error) {
    console.log('Error loading month data:', error);
  }

  return dayData;
};

// ─── Single compact month grid ───────────────────────────────────
const MiniMonth = ({ year, month, data, cellSize, todayInfo, onDayPress }) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const { todayDate, todayMonth, todayYear } = todayInfo;

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ type: 'empty', key: `e-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === todayDate && month === todayMonth && year === todayYear;
    const isFuture = (year > todayYear) ||
      (year === todayYear && month > todayMonth) ||
      (year === todayYear && month === todayMonth && day > todayDate);
    cells.push({ type: 'day', day, isToday, isFuture, tasks: data[day] || null, key: `d-${day}` });
  }

  const starSize = Math.max(cellSize * 0.80, 14);

  return (
    <View style={styles.miniMonth}>
      <Text style={styles.miniMonthTitle}>
        {getMonthNameShort(month)} {year}
      </Text>

      <View style={styles.dayHeaderRow}>
        {DAY_ABBR.map((name, i) => (
          <View key={`${name}-${i}`} style={[styles.dayHeaderCell, { width: cellSize }]}>
            <Text style={styles.dayHeaderText}>{name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {cells.map(cell => (
          <TouchableOpacity
            key={cell.key}
            activeOpacity={cell.type === 'day' && !cell.isFuture ? 0.6 : 1}
            onPress={() => {
              if (cell.type === 'day' && !cell.isFuture && onDayPress) {
                onDayPress({ day: cell.day, month, year, tasks: cell.tasks });
              }
            }}
            style={[
              styles.calendarCell,
              { width: cellSize, height: cellSize + 14 },
              cell.type === 'day' && cell.isToday && styles.todayCell,
            ]}
          >
            {cell.type === 'day' && (
              <>
                <Text style={[
                  styles.dayNumber,
                  cell.isToday && styles.todayNumber,
                  cell.isFuture && styles.futureNumber,
                ]}>
                  {cell.day}
                </Text>
                {cell.tasks && !cell.isFuture && (
                  <CalendarStar tasks={cell.tasks} size={starSize} />
                )}
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
const GoalInput = ({ value, onChange, onSave, saving }) => (
  <View style={{ marginTop: 6 }}>
    <TextInput
      style={{
        backgroundColor: 'rgba(255,255,255,0.15)',
        color: '#fff',
        borderRadius: 8,
        padding: 8,
        fontSize: 14,
        minHeight: 56,
        textAlignVertical: 'top',
      }}
      value={value}
      onChangeText={onChange}
      placeholder="What do you want to grow today?"
      placeholderTextColor="#aaa"
      multiline
    />
    <TouchableOpacity
      onPress={onSave}
      disabled={saving}
      style={{
        marginTop: 6,
        alignSelf: 'flex-end',
        backgroundColor: '#FFD700',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 16,
      }}
    >
      {saving
        ? <ActivityIndicator size="small" color="#000" />
        : <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 13 }}>Save Goal</Text>
      }
    </TouchableOpacity>
  </View>
);

export default function StreakScreen({ navigation }) {
  const { user } = useAuth();
  const today = new Date();

  const [viewMonth, setViewMonth] = useState(
    today.getMonth() === 0 ? 11 : today.getMonth() - 1
  );
  const [viewYear, setViewYear] = useState(
    today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
  );

  const [month1Data, setMonth1Data] = useState({});
  const [month2Data, setMonth2Data] = useState({});
  const [selectedDay, setSelectedDay] = useState(null); // { day, month, year, tasks }
  const [inspiringSaveCount, setInspiringSaveCount] = useState(0);
  const [winningCourages, setWinningCourages] = useState(0);

  // Goal assessment state (matches HomeScreen)
  const [goalAcknowledged, setGoalAcknowledged] = useState(false);
  const [goalMetYes, setGoalMetYes] = useState(false);
  const [goalLocked, setGoalLocked] = useState(false);
  const [showKeepGoalPrompt, setShowKeepGoalPrompt] = useState(false);
  const [yesterdayGoal, setYesterdayGoal] = useState('');
  const [todayGoal, setTodayGoal] = useState('');
  const [goalInputText, setGoalInputText] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const goalLockTimerRef = useRef(null);
  const goalDateRef = useRef(getESTDate());

  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalActiveDays: 0,
    manifestDays: 0,
    artDays: 0,
    goalsSet: 0,
    goalsMet: 0,
    inspireDays: 0,
    couragePosts: 0,
  });

  const m1Year = viewYear;
  const m1Month = viewMonth;
  const m2 = getNextMonth(m1Year, m1Month);
  const m2Year = m2.year;
  const m2Month = m2.month;

  useEffect(() => {
    loadBothMonths();
  }, [m1Year, m1Month]);

  useEffect(() => {
    loadStreakStats();
    loadInspiringCount();
    loadWinCount();
    loadGoals();
  }, []);

  const loadInspiringCount = async () => {
    if (!user || user.uid === 'local') return;
    try {
      const saves = await getMyArtSaves(user.uid);
      setInspiringSaveCount(saves.length);
    } catch (e) {
      console.log('Error loading inspiring count:', e);
    }
  };

  const loadWinCount = async () => {
    if (!user || user.uid === 'local') return;
    try {
      const count = await getUserWinCount(user.uid);
      setWinningCourages(count);
    } catch (e) {
      console.log('Error loading win count:', e);
    }
  };

  // ── Goal assessment functions (matches HomeScreen) ──
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
        setGoalLocked(true);
        if (ack === 'yes') {
          setGoalMetYes(true);
        } else if (ack === 'no') {
          setGoalMetYes(false);
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
            setGoalInputText(parsed.growthGoal.trim());
          }
        } catch (e) {}
      }
    } catch (error) {
      console.log('Error loading goals:', error);
    }
  };

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

  // Refresh stars, calendar, and goals on every focus (tab switch, app reopen)
  const focusRefreshRef = useRef(null);
  focusRefreshRef.current = () => {
    checkGoalDateReset();
    loadGoals();
    loadStreakStats();
    loadBothMonths();
  };

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        if (focusRefreshRef.current) focusRefreshRef.current();
      }, 150);
      return () => clearTimeout(timer);
    }, [])
  );

  // Schedule a timer for midnight while the app is open
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
    }, 30000);
  };

  const handleGoalHeart = async () => {
    if (goalLocked) return;
    const todayStr = getESTDate();
    if (!goalAcknowledged) {
      setGoalAcknowledged(true);
      setGoalMetYes(true);
      await AsyncStorage.setItem(`goal_acknowledged_${todayStr}`, 'yes');
      startLockTimer();
    } else if (goalMetYes) {
      setGoalMetYes(false);
      setShowKeepGoalPrompt(true);
      await AsyncStorage.setItem(`goal_acknowledged_${todayStr}`, 'no');
      startLockTimer();
    } else {
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
      const todayManifestRaw = await AsyncStorage.getItem(`manifest_${todayStr}`);
      const todayManifest = todayManifestRaw ? JSON.parse(todayManifestRaw) : {};
      todayManifest.growthGoal = yesterdayGoal;
      await AsyncStorage.setItem(`manifest_${todayStr}`, JSON.stringify(todayManifest));
      setTodayGoal(yesterdayGoal);
    } else if (!keepIt) {
      setGoalInputText('');
    }
  };

  const handleSaveGoal = async () => {
    const text = goalInputText.trim();
    if (!text) {
      showAlert('Empty Goal', 'Please enter a goal.');
      return;
    }
    setSavingGoal(true);
    try {
      const todayStr = getESTDate();
      if (user) {
        await saveGoal(user.uid, todayStr, { goal: text, completed: false, completedAt: null, carriedForward: false });
      }
      const manifestRaw = await AsyncStorage.getItem(`manifest_${todayStr}`);
      const manifest = manifestRaw ? JSON.parse(manifestRaw) : {};
      manifest.growthGoal = text;
      await AsyncStorage.setItem(`manifest_${todayStr}`, JSON.stringify(manifest));
      setTodayGoal(text);
      trackAction('goal_set');
      showAlert('Saved', 'Goal saved!');
    } catch (error) {
      showAlert('Error', 'Could not save goal.');
      console.log('Save goal error:', error);
    }
    setSavingGoal(false);
  };

  const handleClearData = () => {
    showDestructiveConfirm(
      'Clear All Data?',
      'This will delete all your local entries, artworks, and rankings. This action cannot be undone.',
      () => {
        showDestructiveConfirm(
          'Are you sure?',
          'All of your local data will be permanently erased. This cannot be undone.',
          async () => {
            try {
              await AsyncStorage.clear();
              showAlert('Success', 'All local data has been cleared.');
              loadStreakStats();
              loadBothMonths();
            } catch (error) {
              showAlert('Error', 'Could not clear data.');
            }
          },
          'Yes, Clear Everything'
        );
      },
      'Yes'
    );
  };

  const loadBothMonths = async () => {
    const [d1, d2] = await Promise.all([
      loadMonthData(m1Year, m1Month),
      loadMonthData(m2Year, m2Month),
    ]);
    setMonth1Data(d1);
    setMonth2Data(d2);
  };

  const loadStreakStats = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();

      // Build set of all dates with any activity using the shared criteria
      const activeDates = new Set();
      const manifestKeys = allKeys.filter(k => k.startsWith('manifest_'));
      const artKeys = allKeys.filter(k => k.startsWith('art_created_') || k.startsWith('art_time_'));
      const rankedKeys = allKeys.filter(k => k.startsWith('ranked_'));
      const connectKeys = allKeys.filter(k =>
        k.startsWith('browsed_') || k.startsWith('connected_') ||
        k.startsWith('email_sent_') || k.startsWith('courage_uploaded_') ||
        k.startsWith('inspiration_saved_')
      );
      const goalAckKeys = allKeys.filter(k => k.startsWith('goal_acknowledged_'));

      // Collect all candidate date strings
      const candidateDates = new Set();
      manifestKeys.forEach(k => candidateDates.add(k.replace('manifest_', '')));
      artKeys.forEach(k => {
        const d = k.replace('art_created_', '').replace('art_time_', '');
        if (d.match(/^\d{4}-\d{2}-\d{2}$/)) candidateDates.add(d);
      });
      rankedKeys.forEach(k => candidateDates.add(k.replace('ranked_', '')));
      connectKeys.forEach(k => {
        const d = k.replace('browsed_', '').replace('connected_', '')
          .replace('email_sent_', '').replace('courage_uploaded_', '')
          .replace('inspiration_saved_', '');
        if (d.match(/^\d{4}-\d{2}-\d{2}$/)) candidateDates.add(d);
      });
      goalAckKeys.forEach(k => candidateDates.add(k.replace('goal_acknowledged_', '')));

      // Check each candidate with shared criteria
      for (const dateStr of candidateDates) {
        const tasks = await getTasksForDate(dateStr);
        if (tasks.manifest || tasks.art || tasks.goal || tasks.inspire || tasks.courage) {
          activeDates.add(dateStr);
        }
      }

      // Current streak (consecutive days ending today or yesterday)
      let current = 0;
      const now = new Date();
      const todayStr = getDateString(now);
      let startOffset = activeDates.has(todayStr) ? 0 : 1;
      for (let i = startOffset; i < 3650; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        if (activeDates.has(getDateString(d))) {
          current++;
        } else break;
      }

      // Longest streak
      const sortedDates = [...activeDates].sort();
      let longest = 0, runLen = 0, prevDate = null;
      for (const ds of sortedDates) {
        if (prevDate) {
          const diff = Math.round((new Date(ds) - new Date(prevDate)) / (1000 * 60 * 60 * 24));
          if (diff === 1) runLen++;
          else { longest = Math.max(longest, runLen); runLen = 1; }
        } else runLen = 1;
        prevDate = ds;
      }
      longest = Math.max(longest, runLen);

      // Count goals set vs met
      let goalsSet = 0;
      let goalsMet = 0;
      for (const key of manifestKeys) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            const entry = JSON.parse(raw);
            if (entry.growthGoal && entry.growthGoal.trim()) goalsSet++;
          }
        } catch (e) {}
      }
      for (const key of goalAckKeys) {
        const val = await AsyncStorage.getItem(key);
        if (val === 'yes') goalsMet++;
      }

      // Count per-category days
      let manifestDays = 0, artDays = 0, inspireDays = 0, couragePosts = 0;
      for (const dateStr of activeDates) {
        const tasks = await getTasksForDate(dateStr);
        if (tasks.manifest) manifestDays++;
        if (tasks.art) artDays++;
        if (tasks.inspire) inspireDays++;
        if (tasks.courage) couragePosts++;
      }

      setStreakData({
        currentStreak: current,
        longestStreak: longest,
        totalActiveDays: activeDates.size,
        manifestDays,
        artDays,
        goalsSet,
        goalsMet,
        inspireDays,
        couragePosts,
      });
    } catch (error) {
      console.log('Error loading streak stats:', error);
    }
  };

  const goBack = () => {
    const prev = getPrevMonth(m1Year, m1Month);
    setViewYear(prev.year);
    setViewMonth(prev.month);
  };

  const goForward = () => {
    const next = getNextMonth(m1Year, m1Month);
    const next2 = getNextMonth(next.year, next.month);
    if (next2.year > today.getFullYear() ||
        (next2.year === today.getFullYear() && next2.month > today.getMonth())) return;
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const goToNow = () => {
    const prev = getPrevMonth(today.getFullYear(), today.getMonth());
    setViewYear(prev.year);
    setViewMonth(prev.month);
  };

  // Day detail handlers
  const handleDayPress = (dayInfo) => {
    setSelectedDay(dayInfo);
  };

  const navigateDay = (direction) => {
    if (!selectedDay) return;
    let { day, month: m, year: y } = selectedDay;
    day += direction;
    if (day < 1) {
      const prev = getPrevMonth(y, m);
      y = prev.year;
      m = prev.month;
      day = getDaysInMonth(y, m);
    } else if (day > getDaysInMonth(y, m)) {
      const nx = getNextMonth(y, m);
      y = nx.year;
      m = nx.month;
      day = 1;
    }
    // Don't navigate into future
    if (y > today.getFullYear() ||
      (y === today.getFullYear() && m > today.getMonth()) ||
      (y === today.getFullYear() && m === today.getMonth() && day > today.getDate())) return;

    // Get tasks for this day from loaded data
    let tasks = null;
    if (y === m1Year && m === m1Month) tasks = month1Data[day] || null;
    else if (y === m2Year && m === m2Month) tasks = month2Data[day] || null;

    setSelectedDay({ day, month: m, year: y, tasks });
  };

  const next = getNextMonth(m1Year, m1Month);
  const next2 = getNextMonth(next.year, next.month);
  const forwardBlocked = next2.year > today.getFullYear() ||
    (next2.year === today.getFullYear() && next2.month > today.getMonth());

  const todayInfo = { todayDate: today.getDate(), todayMonth: today.getMonth(), todayYear: today.getFullYear() };

  // Side-by-side: arrow | month | gap | month | arrow
  const arrowWidth = 24;
  const monthGap = 8;
  const availableWidth = SCREEN_WIDTH - 40 - arrowWidth * 2 - monthGap - 8;
  const monthWidth = Math.floor(availableWidth / 2);
  const cellSize = Math.floor((monthWidth - 2) / 7); // -2 for miniMonth paddingHorizontal

  const goalPct = streakData.goalsSet > 0
    ? Math.round((streakData.goalsMet / streakData.goalsSet) * 100)
    : 0;

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Grow</Text>

        {/* Legend */}
        <View style={styles.legendCard}>
          <View style={styles.legendRowH}>
            <View style={[styles.legendDot, { backgroundColor: MAGIC_DARK.manifest }]} />
            <Text style={[styles.legendLetter, { color: MAGIC_DARK.manifest }]}>M</Text>
            <View style={[styles.legendDot, { backgroundColor: MAGIC_DARK.art }]} />
            <Text style={[styles.legendLetter, { color: MAGIC_DARK.art }]}>A</Text>
            <View style={[styles.legendDot, { backgroundColor: MAGIC_DARK.grow }]} />
            <Text style={[styles.legendLetter, { color: MAGIC_DARK.grow }]}>G</Text>
            <View style={[styles.legendDot, { backgroundColor: MAGIC_DARK.inspire }]} />
            <Text style={[styles.legendLetter, { color: MAGIC_DARK.inspire }]}>I</Text>
            <View style={[styles.legendDot, { backgroundColor: MAGIC_DARK.connect }]} />
            <Text style={[styles.legendLetter, { color: MAGIC_DARK.connect }]}>C</Text>
          </View>
        </View>

        {/* Goal Assessment Box */}
        <View style={styles.goalBox}>
          <View style={styles.goalInner}>
            {!goalAcknowledged ? (
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
              <View>
                <Text style={styles.goalAckText}>Great work!</Text>
                <Text style={styles.goalLabel}>Today's Goal:</Text>
                {todayGoal ? (
                  <Text style={styles.goalDisplaySmall}>{todayGoal}</Text>
                ) : (
                  <GoalInput
                    value={goalInputText}
                    onChange={setGoalInputText}
                    onSave={handleSaveGoal}
                    saving={savingGoal}
                  />
                )}
              </View>
            ) : (
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
                      <GoalInput
                        value={goalInputText}
                        onChange={setGoalInputText}
                        onSave={handleSaveGoal}
                        saving={savingGoal}
                      />
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={styles.heartRight}>
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

        {/* Side-by-side calendar */}
        <View style={styles.calendarRow}>
          <TouchableOpacity onPress={goBack} style={styles.sideArrow}>
            <Text style={styles.sideArrowText}>◀</Text>
          </TouchableOpacity>

          <View style={styles.monthsSideBySide}>
            <View style={[styles.monthBox, { width: monthWidth }]}>
              <MiniMonth
                year={m1Year} month={m1Month}
                data={month1Data} cellSize={cellSize}
                todayInfo={todayInfo}
                onDayPress={handleDayPress}
              />
            </View>
            <View style={styles.monthGap} />
            <View style={[styles.monthBox, { width: monthWidth }]}>
              <MiniMonth
                year={m2Year} month={m2Month}
                data={month2Data} cellSize={cellSize}
                todayInfo={todayInfo}
                onDayPress={handleDayPress}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={goForward}
            style={[styles.sideArrow, forwardBlocked && styles.sideArrowDisabled]}
            disabled={forwardBlocked}
          >
            <Text style={[styles.sideArrowText, forwardBlocked && styles.sideArrowTextDisabled]}>▶</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={goToNow} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>

        {/* ── Statistics ── */}

        {/* Row 1: Streak */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{streakData.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{streakData.longestStreak}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{streakData.totalActiveDays}</Text>
            <Text style={styles.statLabel}>Total Active</Text>
          </View>
        </View>

        {/* Premium features — 2×2 grid */}
        <View style={styles.premiumGrid}>
          <View style={styles.premiumGridItem}>
            <PremiumGate feature="streakPause" compact>
              <View />
            </PremiumGate>
          </View>
          <View style={styles.premiumGridItem}>
            <PremiumGate feature="streakSaver" compact>
              <View />
            </PremiumGate>
          </View>
          <View style={styles.premiumGridItem}>
            <PremiumGate feature="advancedStats" compact>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: MAGIC_COLORS.manifest }]}>{streakData.manifestDays}</Text>
                  <Text style={styles.statLabel}>Manifest{'\n'}Days</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: MAGIC_COLORS.art }]}>{streakData.artDays}</Text>
                  <Text style={styles.statLabel}>Art{'\n'}Days</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: MAGIC_COLORS.inspire }]}>{streakData.inspireDays}</Text>
                  <Text style={styles.statLabel}>Inspire{'\n'}Days</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: MAGIC_COLORS.connect }]}>{streakData.couragePosts}</Text>
                  <Text style={styles.statLabel}>Connect{'\n'}Days</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: MAGIC_COLORS.grow }]}>{streakData.goalsSet}</Text>
                  <Text style={styles.statLabel}>Goals{'\n'}Set</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: MAGIC_COLORS.grow }]}>{streakData.goalsMet}</Text>
                  <Text style={styles.statLabel}>Goals{'\n'}Met</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: MAGIC_COLORS.grow }]}>{goalPct}%</Text>
                  <Text style={styles.statLabel}>Goal{'\n'}Rate</Text>
                </View>
              </View>
            </PremiumGate>
          </View>
          {user && user.uid !== 'local' && (
            <View style={styles.premiumGridItem}>
              <PremiumGate feature="inspiringOthers" compact>
                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { flex: 1 }]}>
                    <Text style={[styles.statNumber, { color: '#FF69B4' }]}>{inspiringSaveCount}</Text>
                    <Text style={styles.statLabel}>Times Your Courages{'\n'}Inspired Others</Text>
                  </View>
                </View>
              </PremiumGate>
            </View>
          )}
          {user && user.uid !== 'local' && (
            <View style={styles.premiumGridItem}>
              <View style={styles.statsRow}>
                <View style={[styles.statBox, { flex: 1 }]}>
                  <Text style={[styles.statNumber, { color: '#B8860B' }]}>
                    {winningCourages > 0 ? '🏆 ' : ''}{winningCourages}
                  </Text>
                  <Text style={styles.statLabel}>Winning Courages</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Clear Data */}
        <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
          <Text style={styles.dangerButtonText}>Clear All Local Data</Text>
        </TouchableOpacity>
        <Text style={styles.warningText}>
          This will delete all your local entries, artworks, and rankings permanently.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Day Detail Modal ─── */}
      <Modal
        visible={selectedDay !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={styles.dayModalOverlay}>
          <View style={styles.dayModalCard}>
            {selectedDay && (() => {
              const tasks = selectedDay.tasks || {};
              const allComplete = tasks.manifest && tasks.art && tasks.goal && tasks.inspire && tasks.courage;
              const completedCount = MAGIC_KEYS.filter(k => tasks[k]).length;
              const dateStr = `${getMonthNameShort(selectedDay.month)} ${selectedDay.day}, ${selectedDay.year}`;
              const starSize = 90;

              const pointAngles = [
                { key: 'manifest', angle: -90 },
                { key: 'art',      angle: -90 + 72 },
                { key: 'goal',     angle: -90 + 144 },
                { key: 'inspire',  angle: -90 + 216 },
                { key: 'courage',  angle: -90 + 288 },
              ];
              const pointColors = {
                manifest: tasks.manifest ? MAGIC_COLORS.manifest : '#1a2a4a',
                art:      tasks.art      ? MAGIC_COLORS.art      : '#1a2a4a',
                goal:     tasks.goal     ? MAGIC_COLORS.grow     : '#1a2a4a',
                inspire:  tasks.inspire  ? MAGIC_COLORS.inspire  : '#1a2a4a',
                courage:  tasks.courage  ? MAGIC_COLORS.connect  : '#1a2a4a',
              };

              return (
                <>
                  {/* Header with date and arrows */}
                  <View style={styles.dayModalHeader}>
                    <TouchableOpacity onPress={() => navigateDay(-1)} style={styles.dayNavArrow}>
                      <Text style={styles.dayNavArrowText}>◀</Text>
                    </TouchableOpacity>
                    <Text style={styles.dayModalDate}>{dateStr}</Text>
                    <TouchableOpacity onPress={() => navigateDay(1)} style={styles.dayNavArrow}>
                      <Text style={styles.dayNavArrowText}>▶</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Large star */}
                  <View style={{ alignItems: 'center', marginVertical: 16 }}>
                    <View style={{ width: starSize, height: starSize, justifyContent: 'center', alignItems: 'center' }}>
                      {allComplete && (
                        <>
                          <View style={{
                            position: 'absolute',
                            width: starSize + 30,
                            height: starSize + 30,
                            borderRadius: (starSize + 30) / 2,
                            backgroundColor: 'rgba(255, 215, 0, 0.15)',
                          }} />
                          <View style={{
                            position: 'absolute',
                            width: starSize + 18,
                            height: starSize + 18,
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
                          fontSize: 16,
                          fontWeight: 'bold',
                          color: tasks[MAGIC_KEYS[i]] ? MAGIC_COLOR_ARRAY[i] : '#888',
                          marginHorizontal: 3,
                        }}>{letter}</Text>
                      ))}
                    </View>

                    <Text style={styles.dayModalProgress}>
                      {completedCount}/5 completed
                    </Text>
                  </View>

                  {/* Guidance list */}
                  <View style={styles.dayModalGuidance}>
                    {MAGIC_KEYS.map((key, i) => {
                      const done = !!tasks[key];
                      return (
                        <View key={key} style={styles.guidanceRow}>
                          <View style={[styles.guidanceDot, {
                            backgroundColor: done ? MAGIC_COLOR_ARRAY[i] : '#888',
                          }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.guidanceLabel, {
                              color: done ? MAGIC_COLOR_ARRAY[i] : '#ffffff',
                            }]}>
                              {done ? '✓ ' : ''}{MAGIC_LABELS[i]}
                            </Text>
                            {!done && (
                              <Text style={styles.guidanceHint}>{MAGIC_GUIDANCE[i]}</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.dayModalClose}>
                    <Text style={styles.dayModalCloseText}>Close</Text>
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

// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  content: {
    padding: 20,
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#c1a900',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },

  // Legend
  legendCard: {
    backgroundColor: 'rgba(255, 254, 190, 0.25)',
    borderWidth: 1,
    borderColor: '#b18630',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  legendRowH: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLetter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginRight: 6,
  },

  // Calendar row: ◀ [month | month] ▶
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
  },
  sideArrow: {
    paddingVertical: 60,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  sideArrowDisabled: {
    opacity: 0.25,
  },
  sideArrowText: {
    fontSize: 16,
    color: '#662C1A',
  },
  sideArrowTextDisabled: {
    color: '#555',
  },

  // Side-by-side months
  monthsSideBySide: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 254, 190, 0.25)',
    borderWidth: 1,
    borderColor: '#662C1A',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  monthBox: {
    overflow: 'hidden',
  },
  monthGap: {
    width: 6,
    backgroundColor: '#662C1A',
    marginVertical: 4,
  },

  // Mini month
  miniMonth: {
    paddingHorizontal: 1,
  },
  miniMonthTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#662C1A',
    textAlign: 'center',
    marginBottom: 2,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  dayHeaderCell: {
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 7,
    fontWeight: '600',
    color: '#662C1A',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarCell: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 1,
  },
  todayCell: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  dayNumber: {
    fontSize: 7,
    color: '#662C1A',
    marginBottom: 0,
  },
  todayNumber: {
    color: '#662C1A',
    fontWeight: 'bold',
  },
  futureNumber: {
    color: '#555',
  },

  // Today button
  todayButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 14,
  },
  todayButtonText: {
    fontSize: 13,
    color: '#c1a900',
    fontWeight: '600',
  },

  // Premium 2×2 grid
  premiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  premiumGridItem: {
    width: '48%',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 254, 190, 0.25)',
    borderWidth: 1,
    borderColor: '#b18630',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c1a900',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#c1a900',
    textAlign: 'center',
  },

  // Day Detail Modal
  dayModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  dayModalCard: {
    backgroundColor: 'rgba(255, 254, 190, 0.25)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#b18630',
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  dayModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayNavArrow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dayNavArrowText: {
    fontSize: 20,
    color: '#b18630',
  },
  dayModalDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b18630',
    textAlign: 'center',
  },
  dayModalProgress: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  dayModalGuidance: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#b18630',
    paddingTop: 12,
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  guidanceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  guidanceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  guidanceHint: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 2,
    fontStyle: 'italic',
  },
  dayModalClose: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b18630',
    backgroundColor: 'rgba(255, 254, 190, 0.25)',
  },
  dayModalCloseText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  // Goal Assessment
  goalBox: {
    backgroundColor: 'rgba(255, 254, 190, 0.25)',
    borderWidth: 2,
    borderColor: '#c1a900',
    borderRadius: 10,
    marginBottom: 10,
  },
  goalInner: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitleSmall: {
    fontSize: 16,
    color: '#c1a900',
    fontWeight: '600',
    marginBottom: 4,
  },
  goalSubtextSmall: {
    fontSize: 13,
    color: '#c1a900',
    marginBottom: 4,
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
  heartRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  lockIcon: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  underline: {
    textDecorationLine: 'underline',
  },

  // Clear Data
  dangerButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

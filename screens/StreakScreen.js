import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  ImageBackground
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_ABBR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// MAGIC color constants
const MAGIC_COLORS = {
  manifest: '#DC143C',  // Maroon/Red
  art:      '#FF7F00',  // Orange
  grow:     '#FFD700',  // Yellow/Gold
  inspire:  '#22C55E',  // Green
  connect:  '#6366F1',  // Indigo
};
const MAGIC_KEYS = ['manifest', 'art', 'goal', 'inspire', 'courage'];
const MAGIC_COLOR_ARRAY = [MAGIC_COLORS.manifest, MAGIC_COLORS.art, MAGIC_COLORS.grow, MAGIC_COLORS.inspire, MAGIC_COLORS.connect];
const MAGIC_LABELS = ['Manifest', 'Art', 'Grow', 'Inspire', 'Connect'];
const MAGIC_GUIDANCE = [
  'Write in your Muse, Dump, or Vision journal',
  'Use the art timer, create, or upload artwork',
  'Set a growth goal in your Manifest',
  'Vote on today\'s artwork rankings',
  'Browse curations, send inspiration, or save art',
];

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
      <View style={{
        width: size * 0.28,
        height: size * 0.28,
        borderRadius: size * 0.14,
        backgroundColor: allComplete ? '#FFD700' : '#0d1530',
        position: 'absolute',
        zIndex: 10,
      }} />
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
          borderBottomColor: allComplete ? '#FFD700' : pointColors[key],
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
const getDateString = (date) => date.toISOString().split('T')[0];

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
const loadMonthData = async (year, month) => {
  const daysInMonth = getDaysInMonth(year, month);
  const dayData = {};

  try {
    const publicRaw = await AsyncStorage.getItem('public_artworks');
    const publicArtworks = publicRaw ? JSON.parse(publicRaw) : [];
    const allKeys = await AsyncStorage.getAllKeys();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = getDateString(new Date(year, month, day));

      const manifestKey = `manifest_${dateStr}`;
      const hasManifest = allKeys.includes(manifestKey);
      let manifestRaw = null;
      let hasGoal = false;
      if (hasManifest) {
        manifestRaw = await AsyncStorage.getItem(manifestKey);
        if (manifestRaw) {
          try {
            const entry = JSON.parse(manifestRaw);
            hasGoal = !!(entry.growthGoal && entry.growthGoal.trim());
          } catch (e) {}
        }
      }

      const artTimeRaw = await AsyncStorage.getItem(`art_time_${dateStr}`);
      let hasArt = !!(artTimeRaw && parseInt(artTimeRaw) > 0);
      if (!hasArt) {
        const now = new Date();
        const checkDate = new Date(year, month, day);
        const diffDays = Math.floor((now - checkDate) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          const weeklyTime = await AsyncStorage.getItem('weekly_art_time');
          hasArt = !!(weeklyTime && parseInt(weeklyTime) > 0);
        }
      }

      const ranked = await AsyncStorage.getItem(`ranked_${dateStr}`);
      const hasInspire = ranked === 'true';
      const hasCourage = publicArtworks.some(a => a.date === dateStr);
      const hasAny = !!(hasManifest && manifestRaw) || hasArt || hasGoal || hasInspire || hasCourage;

      if (hasAny) {
        dayData[day] = {
          manifest: !!(hasManifest && manifestRaw),
          art: hasArt,
          goal: hasGoal,
          inspire: hasInspire,
          courage: hasCourage,
        };
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
export default function StreakScreen() {
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
  }, []);

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
      const manifestKeys = allKeys.filter(k => k.startsWith('manifest_'));
      const rankedKeys = allKeys.filter(k => k.startsWith('ranked_'));
      const publicRaw = await AsyncStorage.getItem('public_artworks');
      const publicArtworks = publicRaw ? JSON.parse(publicRaw) : [];

      const activeDates = new Set();
      manifestKeys.forEach(k => activeDates.add(k.replace('manifest_', '')));
      rankedKeys.forEach(k => activeDates.add(k.replace('ranked_', '')));
      publicArtworks.forEach(a => { if (a.date) activeDates.add(a.date); });

      // Current streak
      let current = 0;
      let checkDate = new Date();
      const todayStr = getDateString(new Date());
      if (!activeDates.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      for (let i = 0; i < 3650; i++) {
        if (activeDates.has(getDateString(checkDate))) {
          current++;
          checkDate.setDate(checkDate.getDate() - 1);
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
            if (entry.growthGoal && entry.growthGoal.trim()) {
              goalsSet++;
            }
          }
        } catch (e) {}
      }
      // Count goal acknowledgements
      const ackKeys = allKeys.filter(k => k.startsWith('goal_acknowledged_'));
      for (const key of ackKeys) {
        const val = await AsyncStorage.getItem(key);
        if (val === 'yes') goalsMet++;
      }

      setStreakData({
        currentStreak: current,
        longestStreak: longest,
        totalActiveDays: activeDates.size,
        manifestDays: manifestKeys.length,
        artDays: 0, // placeholder — tracked weekly not daily
        goalsSet,
        goalsMet,
        inspireDays: rankedKeys.length,
        couragePosts: publicArtworks.length,
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
            <View style={[styles.legendDot, { backgroundColor: MAGIC_COLORS.manifest }]} />
            <Text style={[styles.legendLetter, { color: MAGIC_COLORS.manifest }]}>M</Text>
            <View style={[styles.legendDot, { backgroundColor: MAGIC_COLORS.art }]} />
            <Text style={[styles.legendLetter, { color: MAGIC_COLORS.art }]}>A</Text>
            <View style={[styles.legendDot, { backgroundColor: MAGIC_COLORS.grow }]} />
            <Text style={[styles.legendLetter, { color: MAGIC_COLORS.grow }]}>G</Text>
            <View style={[styles.legendDot, { backgroundColor: MAGIC_COLORS.inspire }]} />
            <Text style={[styles.legendLetter, { color: MAGIC_COLORS.inspire }]}>I</Text>
            <View style={[styles.legendDot, { backgroundColor: MAGIC_COLORS.connect }]} />
            <Text style={[styles.legendLetter, { color: MAGIC_COLORS.connect }]}>C</Text>
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

        {/* Row 2: MAGIC category counts */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: MAGIC_COLORS.manifest }]}>{streakData.manifestDays}</Text>
            <Text style={styles.statLabel}>Manifest{'\n'}Days</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: MAGIC_COLORS.inspire }]}>{streakData.inspireDays}</Text>
            <Text style={styles.statLabel}>Inspire{'\n'}Days</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: MAGIC_COLORS.connect }]}>{streakData.couragePosts}</Text>
            <Text style={styles.statLabel}>Connect{'\n'}Posts</Text>
          </View>
        </View>

        {/* Row 3: Goals */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: MAGIC_COLORS.grow }]}>{streakData.goalsSet}</Text>
            <Text style={styles.statLabel}>Goals Set</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: MAGIC_COLORS.grow }]}>{streakData.goalsMet}</Text>
            <Text style={styles.statLabel}>Goals Met</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: MAGIC_COLORS.grow }]}>{goalPct}%</Text>
            <Text style={styles.statLabel}>Goal Rate</Text>
          </View>
        </View>

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
                      <View style={{
                        width: starSize * 0.3, height: starSize * 0.3,
                        borderRadius: starSize * 0.15,
                        backgroundColor: allComplete ? '#FFD700' : '#0d1530',
                        position: 'absolute', zIndex: 10,
                      }} />
                      {pointAngles.map(({ key, angle }) => (
                        <View key={key} style={{
                          position: 'absolute',
                          width: 0, height: 0,
                          borderLeftWidth: starSize * 0.12,
                          borderRightWidth: starSize * 0.12,
                          borderBottomWidth: starSize * 0.42,
                          borderLeftColor: 'transparent',
                          borderRightColor: 'transparent',
                          borderBottomColor: allComplete ? '#FFD700' : pointColors[key],
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
                              color: done ? MAGIC_COLOR_ARRAY[i] : '#1a1a1a',
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
    color: '#662C1A',
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
    color: '#87CEEB',
    fontWeight: '600',
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
    color: '#4FC3F7',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
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
    color: '#333',
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
});

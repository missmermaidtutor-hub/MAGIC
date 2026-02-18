import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_ABBR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Mini 5-point MAGIC star for calendar cells ───────────────────
const CalendarStar = ({ tasks = {}, size = 14 }) => {
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

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {allComplete && (
        <View style={{
          position: 'absolute',
          width: size + 3,
          height: size + 3,
          borderRadius: (size + 3) / 2,
          backgroundColor: 'rgba(79, 195, 247, 0.3)',
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
        backgroundColor: allComplete ? '#4FC3F7' : '#0d1530',
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
          borderBottomColor: pointColors[key],
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
const MiniMonth = ({ year, month, data, cellSize, todayInfo }) => {
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

  const starSize = Math.max(cellSize * 0.55, 10);

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
          <View
            key={cell.key}
            style={[
              styles.calendarCell,
              { width: cellSize, height: cellSize + 6 },
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
          </View>
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
  const cellSize = Math.floor(monthWidth / 7);

  const goalPct = streakData.goalsSet > 0
    ? Math.round((streakData.goalsMet / streakData.goalsSet) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Grow</Text>

        {/* Legend */}
        <View style={styles.legendCard}>
          <View style={styles.legendRowH}>
            <View style={[styles.legendDot, { backgroundColor: '#DDA0DD' }]} />
            <Text style={styles.legendLetter}>M</Text>
            <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
            <Text style={styles.legendLetter}>A</Text>
            <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.legendLetter}>G</Text>
            <View style={[styles.legendDot, { backgroundColor: '#87CEEB' }]} />
            <Text style={styles.legendLetter}>I</Text>
            <View style={[styles.legendDot, { backgroundColor: '#90EE90' }]} />
            <Text style={styles.legendLetter}>C</Text>
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
              />
            </View>
            <View style={styles.monthGap} />
            <View style={[styles.monthBox, { width: monthWidth }]}>
              <MiniMonth
                year={m2Year} month={m2Month}
                data={month2Data} cellSize={cellSize}
                todayInfo={todayInfo}
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
            <Text style={[styles.statNumber, { color: '#DDA0DD' }]}>{streakData.manifestDays}</Text>
            <Text style={styles.statLabel}>Manifest{'\n'}Days</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#87CEEB' }]}>{streakData.inspireDays}</Text>
            <Text style={styles.statLabel}>Inspire{'\n'}Days</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#90EE90' }]}>{streakData.couragePosts}</Text>
            <Text style={styles.statLabel}>Courage{'\n'}Posts</Text>
          </View>
        </View>

        {/* Row 3: Goals */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{streakData.goalsSet}</Text>
            <Text style={styles.statLabel}>Goals Set</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{streakData.goalsMet}</Text>
            <Text style={styles.statLabel}>Goals Met</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{goalPct}%</Text>
            <Text style={styles.statLabel}>Goal Rate</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },

  // Legend
  legendCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#FFD700',
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
    fontSize: 13,
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
    color: '#FFD700',
  },
  sideArrowTextDisabled: {
    color: '#555',
  },

  // Side-by-side months
  monthsSideBySide: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  monthBox: {
    overflow: 'hidden',
  },
  monthGap: {
    width: 6,
    backgroundColor: '#333',
    marginVertical: 4,
  },

  // Mini month
  miniMonth: {
    paddingHorizontal: 1,
  },
  miniMonthTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFD700',
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
    color: '#555',
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
    color: '#777',
    marginBottom: 0,
  },
  todayNumber: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  futureNumber: {
    color: '#333',
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
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
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
});

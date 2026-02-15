import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StreakScreen() {
  const [streakData, setStreakData] = useState({
    manifestDays: 0,
    artDays: 0,
    growthDays: 0,
    goalsSet: 0,
    goalsMet: 0,
    inspirationReceived: 0,
    inspirationGiven: 0,
    couragePosts: 0,
    highestRank: 0,
    currentStreak: 0,
    longestStreak: 0
  });

  const [calendarDays, setCalendarDays] = useState([]);

  useEffect(() => {
    loadStreakData();
    generateCalendar();
  }, []);

  const loadStreakData = async () => {
    try {
      // Load manifest entries
      const manifestKeys = await AsyncStorage.getAllKeys();
      const manifestCount = manifestKeys.filter(key => key.startsWith('manifest_')).length;

      // Load art time data
      const weeklyTime = await AsyncStorage.getItem('weekly_art_time');
      const artDays = weeklyTime ? Math.floor(parseInt(weeklyTime) / 60) : 0; // Rough estimate

      // For now, using placeholder data for other stats
      // These will be populated as we build more features
      setStreakData({
        manifestDays: manifestCount,
        artDays: artDays > 0 ? artDays : 0,
        growthDays: manifestCount, // Placeholder
        goalsSet: manifestCount,
        goalsMet: Math.floor(manifestCount * 0.87), // 87% as per your design
        inspirationReceived: 42, // Placeholder
        inspirationGiven: 24, // Placeholder
        couragePosts: 24, // Placeholder
        highestRank: 4.1, // Placeholder
        currentStreak: Math.min(manifestCount, 4),
        longestStreak: Math.min(manifestCount + 1, 24)
      });
    } catch (error) {
      console.log('Error loading streak data:', error);
    }
  };

  const generateCalendar = () => {
    const days = [];
    const today = new Date();
    
    // Generate last 35 days (5 weeks)
    for (let i = 34; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Placeholder: mark some days as complete
      const isComplete = Math.random() > 0.3; // For demo
      
      days.push({
        date: date.getDate(),
        isToday: i === 0,
        isComplete: isComplete
      });
    }
    
    setCalendarDays(days);
  };

  const getGoalPercentage = () => {
    if (streakData.goalsSet === 0) return 0;
    return Math.round((streakData.goalsMet / streakData.goalsSet) * 100);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Streak</Text>

        {/* MAGIC Explanation */}
        <View style={styles.magicCard}>
          <Text style={styles.magicTitle}>Completely fill your star by daily MAGIC</Text>
          <View style={styles.magicList}>
            <Text style={styles.magicItem}>1. <Text style={styles.bold}>M</Text>anifest (Journal)</Text>
            <Text style={styles.magicItem}>2. <Text style={styles.bold}>A</Text>rt</Text>
            <Text style={styles.magicItem}>3. <Text style={styles.bold}>G</Text>oal set</Text>
            <Text style={styles.magicItem}>4. <Text style={styles.bold}>I</Text>nspiration (rank)</Text>
            <Text style={styles.magicItem}>5. <Text style={styles.bold}>C</Text>ourage (post for ranking)</Text>
          </View>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <View 
                key={index} 
                style={[
                  styles.calendarDay,
                  day.isComplete && styles.calendarDayComplete,
                  day.isToday && styles.calendarDayToday
                ]}
              >
                {day.isToday && <View style={styles.todayDot} />}
              </View>
            ))}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          
          {/* Manifest Days */}
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Manifest Days</Text>
            <Text style={styles.statNumber}>{streakData.manifestDays}</Text>
            <Text style={styles.statSubtext}>(journaled)</Text>
          </View>

          {/* Art Activity Days */}
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Art Activity Days</Text>
            <Text style={styles.statNumber}>{streakData.artDays}</Text>
            <Text style={styles.statSubtext}>used timer or tools</Text>
          </View>

          {/* Growth Days */}
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Growth Days</Text>
            <View style={styles.statRow}>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{streakData.goalsSet}</Text>
                <Text style={styles.statSubtext}>new goals set</Text>
              </View>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{getGoalPercentage()}%</Text>
                <Text style={styles.statSubtext}>days met goal</Text>
              </View>
            </View>
          </View>

          {/* Inspiration */}
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Inspiration</Text>
            <View style={styles.statRow}>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{streakData.inspirationReceived}</Text>
                <Text style={styles.statSubtext}>Receipts</Text>
              </View>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{streakData.inspirationGiven}</Text>
                <Text style={styles.statSubtext}>Gifts given</Text>
              </View>
            </View>
          </View>

          {/* Courage */}
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Courage</Text>
            <View style={styles.statRow}>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{streakData.highestRank.toFixed(1)}</Text>
                <Text style={styles.statSubtext}>Highest rank</Text>
              </View>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{streakData.couragePosts}</Text>
                <Text style={styles.statSubtext}>Courage Days</Text>
              </View>
            </View>
          </View>

          {/* Streak */}
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Streak</Text>
            <View style={styles.statRow}>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{streakData.currentStreak}</Text>
                <Text style={styles.statSubtext}>Current</Text>
              </View>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{streakData.longestStreak}</Text>
                <Text style={styles.statSubtext}>Longest</Text>
              </View>
            </View>
          </View>

        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  content: {
    padding: 20,
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  magicCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#4FC3F7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  magicTitle: {
    fontSize: 16,
    color: '#4FC3F7',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
  },
  magicList: {
    alignItems: 'flex-start',
  },
  magicItem: {
    fontSize: 16,
    color: '#4FC3F7',
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  calendarCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#4FC3F7',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  calendarDay: {
    width: 40,
    height: 40,
    margin: 2,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayComplete: {
    backgroundColor: '#4FC3F7',
    borderColor: '#4FC3F7',
  },
  calendarDayToday: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  statsContainer: {
    gap: 16,
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#4FC3F7',
    borderRadius: 12,
    padding: 20,
  },
  statTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4FC3F7',
    marginBottom: 15,
    textAlign: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4FC3F7',
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 14,
    color: '#87CEEB',
    textAlign: 'center',
    marginTop: 5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
});

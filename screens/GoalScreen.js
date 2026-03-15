import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { saveGoal, getGoal, getGoalHistory, getGoalStats } from '../services/firestoreService';

const getDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getDateString(d);
};

const formatDateLabel = (dateStr) => {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
};

export default function GoalScreen({ navigation }) {
  const { user } = useAuth();
  const [goalText, setGoalText] = useState('');
  const [todayGoal, setTodayGoal] = useState(null); // { goal, completed, carriedForward }
  const [yesterdayGoal, setYesterdayGoal] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const todayStr = getDateString(new Date());
  const yesterdayStr = getYesterdayString();

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        // Load from Firestore
        const [today, yesterday, hist, goalStats] = await Promise.all([
          getGoal(user.uid, todayStr),
          getGoal(user.uid, yesterdayStr),
          getGoalHistory(user.uid, 30),
          getGoalStats(user.uid),
        ]);
        setTodayGoal(today);
        setYesterdayGoal(yesterday);
        setHistory(hist);
        setStats(goalStats);
        if (today?.goal) setGoalText(today.goal);
      } else {
        // Fallback: load from AsyncStorage manifest
        const manifestRaw = await AsyncStorage.getItem(`manifest_${todayStr}`);
        if (manifestRaw) {
          const parsed = JSON.parse(manifestRaw);
          if (parsed.growthGoal?.trim()) {
            setTodayGoal({ goal: parsed.growthGoal.trim(), completed: false });
            setGoalText(parsed.growthGoal.trim());
          }
        }
        const yManifest = await AsyncStorage.getItem(`manifest_${yesterdayStr}`);
        if (yManifest) {
          const parsed = JSON.parse(yManifest);
          if (parsed.growthGoal?.trim()) {
            setYesterdayGoal({ goal: parsed.growthGoal.trim(), completed: false });
          }
        }
      }
    } catch (error) {
      console.log('Error loading goals:', error);
    }
    setLoading(false);
  }, [user, todayStr, yesterdayStr]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const handleSaveGoal = async () => {
    const text = goalText.trim();
    if (!text) {
      Alert.alert('Empty Goal', 'Please enter a goal.');
      return;
    }
    setSaving(true);
    try {
      const goalData = {
        goal: text,
        completed: todayGoal?.completed || false,
        completedAt: todayGoal?.completedAt || null,
        carriedForward: todayGoal?.carriedForward || false,
      };

      if (user) {
        await saveGoal(user.uid, todayStr, goalData);
      }

      // Also save to AsyncStorage manifest for the G star on HomeScreen
      const manifestRaw = await AsyncStorage.getItem(`manifest_${todayStr}`);
      const manifest = manifestRaw ? JSON.parse(manifestRaw) : {};
      manifest.growthGoal = text;
      await AsyncStorage.setItem(`manifest_${todayStr}`, JSON.stringify(manifest));

      setTodayGoal(goalData);
      await loadGoals();
      Alert.alert('Saved', 'Goal saved!');
    } catch (error) {
      Alert.alert('Error', 'Could not save goal.');
      console.log('Save goal error:', error);
    }
    setSaving(false);
  };

  const handleToggleComplete = async () => {
    if (!todayGoal) return;
    setSaving(true);
    try {
      const newCompleted = !todayGoal.completed;
      const goalData = {
        ...todayGoal,
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : null,
      };

      if (user) {
        await saveGoal(user.uid, todayStr, goalData);
      }

      setTodayGoal(goalData);
      await loadGoals();
    } catch (error) {
      Alert.alert('Error', 'Could not update goal.');
    }
    setSaving(false);
  };

  const handleCarryForward = async () => {
    if (!yesterdayGoal?.goal) return;
    setSaving(true);
    try {
      const goalData = {
        goal: yesterdayGoal.goal,
        completed: false,
        completedAt: null,
        carriedForward: true,
      };

      if (user) {
        await saveGoal(user.uid, todayStr, goalData);
      }

      // Also update manifest AsyncStorage
      const manifestRaw = await AsyncStorage.getItem(`manifest_${todayStr}`);
      const manifest = manifestRaw ? JSON.parse(manifestRaw) : {};
      manifest.growthGoal = yesterdayGoal.goal;
      await AsyncStorage.setItem(`manifest_${todayStr}`, JSON.stringify(manifest));

      setGoalText(yesterdayGoal.goal);
      setTodayGoal(goalData);
      await loadGoals();
      Alert.alert('Carried Forward', 'Yesterday\'s goal has been set as today\'s goal.');
    } catch (error) {
      Alert.alert('Error', 'Could not carry forward goal.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Goals</Text>
          <View style={{ width: 44 }} />
        </View>
        <Text style={styles.subtitle}>Set & Track Your Growth</Text>

        {/* Carry forward prompt */}
        {!todayGoal && yesterdayGoal && !yesterdayGoal.completed && (
          <View style={styles.carryCard}>
            <Text style={styles.carryTitle}>Yesterday's Goal (unfinished)</Text>
            <Text style={styles.carryGoalText}>{yesterdayGoal.goal}</Text>
            <TouchableOpacity style={styles.carryButton} onPress={handleCarryForward} disabled={saving}>
              <Text style={styles.carryButtonText}>Carry Forward to Today</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Goal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Goal</Text>
          {todayGoal?.carriedForward && (
            <Text style={styles.carriedTag}>Carried from yesterday</Text>
          )}

          <TextInput
            style={styles.goalInput}
            value={goalText}
            onChangeText={setGoalText}
            placeholder="What do you want to grow today?"
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveGoal}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {todayGoal ? 'Update Goal' : 'Set Goal'}
                </Text>
              )}
            </TouchableOpacity>

            {todayGoal && (
              <TouchableOpacity
                style={[
                  styles.completeButton,
                  todayGoal.completed && styles.completedButton,
                ]}
                onPress={handleToggleComplete}
                disabled={saving}
              >
                <Text style={[
                  styles.completeButtonText,
                  todayGoal.completed && styles.completedButtonText,
                ]}>
                  {todayGoal.completed ? 'Completed!' : 'Mark Complete'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Goal Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalGoals}</Text>
                <Text style={styles.statLabel}>Goals Set</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.completedGoals}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {stats.totalGoals > 0
                    ? Math.round((stats.completedGoals / stats.totalGoals) * 100)
                    : 0}%
                </Text>
                <Text style={styles.statLabel}>Rate</Text>
              </View>
            </View>
          </View>
        )}

        {/* History toggle */}
        <TouchableOpacity
          style={styles.historyToggle}
          onPress={() => setShowHistory(!showHistory)}
        >
          <Text style={styles.historyToggleText}>
            {showHistory ? 'Hide History' : 'View Goal History'}
          </Text>
          <Text style={styles.historyArrow}>{showHistory ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {/* History list */}
        {showHistory && (
          <View style={styles.historyCard}>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>No goals yet. Set your first one above!</Text>
            ) : (
              history.map((item, index) => (
                <View key={item.id || index} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>{formatDateLabel(item.id)}</Text>
                    <Text style={item.completed ? styles.historyComplete : styles.historyIncomplete}>
                      {item.completed ? 'Completed' : 'Not completed'}
                    </Text>
                  </View>
                  <Text style={styles.historyGoalText}>{item.goal}</Text>
                  {item.carriedForward && (
                    <Text style={styles.historyCarried}>Carried forward</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },

  // Carry forward card
  carryCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  carryTitle: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 6,
  },
  carryGoalText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    lineHeight: 22,
  },
  carryButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  carryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Today's goal card
  card: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
  },
  carriedTag: {
    fontSize: 12,
    color: '#FF6B6B',
    fontStyle: 'italic',
    marginTop: -8,
    marginBottom: 10,
  },
  goalInput: {
    backgroundColor: 'rgba(10, 14, 39, 0.6)',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flex: 1,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flex: 1,
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  completedButton: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  completeButtonText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedButtonText: {
    color: '#fff',
  },

  // Stats
  statsCard: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderWidth: 2,
    borderColor: '#4FC3F7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4FC3F7',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },

  // History
  historyToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  historyToggleText: {
    color: '#4FC3F7',
    fontSize: 16,
    fontWeight: '600',
  },
  historyArrow: {
    color: '#4FC3F7',
    fontSize: 14,
  },
  historyCard: {
    backgroundColor: 'rgba(24, 112, 162, 0.3)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyDate: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '600',
  },
  historyComplete: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '600',
  },
  historyIncomplete: {
    fontSize: 12,
    color: '#FF6B6B',
  },
  historyGoalText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 20,
  },
  historyCarried: {
    fontSize: 11,
    color: '#FF6B6B',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

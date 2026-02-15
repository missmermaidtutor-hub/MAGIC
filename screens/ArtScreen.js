import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import promptsData from '../prompts.json';

export default function ArtScreen() {
  // Daily timer (20 minutes)
  const [dailyTime, setDailyTime] = useState(20 * 60); // 20 minutes in seconds
  const [isDailyRunning, setIsDailyRunning] = useState(false);
  
  // Weekly stopwatch
  const [weeklyTime, setWeeklyTime] = useState(0);
  const [isWeeklyRunning, setIsWeeklyRunning] = useState(false);
  
  // Challenge
  const [todaysChallenge, setTodaysChallenge] = useState('');
  
  // Refs for intervals
  const dailyIntervalRef = useRef(null);
  const weeklyIntervalRef = useRef(null);

  // Load saved weekly time on mount
  useEffect(() => {
    loadWeeklyTime();
    loadDailyChallenge();
    return () => {
      // Cleanup intervals
      if (dailyIntervalRef.current) clearInterval(dailyIntervalRef.current);
      if (weeklyIntervalRef.current) clearInterval(weeklyIntervalRef.current);
    };
  }, []);

  // Load weekly time from storage
  const loadWeeklyTime = async () => {
    try {
      const saved = await AsyncStorage.getItem('weekly_art_time');
      const weekStart = await AsyncStorage.getItem('week_start_date');
      const today = new Date();
      const currentWeekStart = getWeekStart(today);
      
      // If it's a new week, reset the timer
      if (weekStart !== currentWeekStart) {
        await AsyncStorage.setItem('week_start_date', currentWeekStart);
        setWeeklyTime(0);
      } else if (saved) {
        setWeeklyTime(parseInt(saved));
      }
    } catch (error) {
      console.log('Error loading weekly time:', error);
    }
  };

  // Get start of current week (Monday)
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  // Save weekly time
  const saveWeeklyTime = async (time) => {
    try {
      await AsyncStorage.setItem('weekly_art_time', time.toString());
    } catch (error) {
      console.log('Error saving weekly time:', error);
    }
  };

  // Load or generate daily challenge
  const loadDailyChallenge = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const savedDate = await AsyncStorage.getItem('challenge_date');
      const savedChallenge = await AsyncStorage.getItem('todays_challenge');
      
      if (savedDate === today && savedChallenge) {
        setTodaysChallenge(savedChallenge);
      } else {
        // New day, generate new challenge from prompts
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const promptIndex = dayOfYear % promptsData.length;
        const newChallenge = promptsData[promptIndex];
        
        setTodaysChallenge(newChallenge);
        await AsyncStorage.setItem('challenge_date', today);
        await AsyncStorage.setItem('todays_challenge', newChallenge);
      }
    } catch (error) {
      console.log('Error loading challenge:', error);
      // Fallback to first prompt
      setTodaysChallenge(promptsData[0] || 'Create something beautiful');
    }
  };

  // Daily timer controls
  const toggleDailyTimer = () => {
    if (isDailyRunning) {
      clearInterval(dailyIntervalRef.current);
      setIsDailyRunning(false);
    } else {
      setIsDailyRunning(true);
      dailyIntervalRef.current = setInterval(() => {
        setDailyTime((prev) => {
          if (prev <= 1) {
            clearInterval(dailyIntervalRef.current);
            setIsDailyRunning(false);
            Alert.alert('Time\'s Up!', '20 minutes of art time complete! 🎨');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const resetDailyTimer = () => {
    clearInterval(dailyIntervalRef.current);
    setIsDailyRunning(false);
    setDailyTime(20 * 60);
  };

  // Weekly stopwatch controls
  const toggleWeeklyStopwatch = () => {
    if (isWeeklyRunning) {
      clearInterval(weeklyIntervalRef.current);
      setIsWeeklyRunning(false);
      saveWeeklyTime(weeklyTime);
    } else {
      setIsWeeklyRunning(true);
      weeklyIntervalRef.current = setInterval(() => {
        setWeeklyTime((prev) => {
          const newTime = prev + 1;
          return newTime;
        });
      }, 1000);
    }
  };

  const resetWeeklyStopwatch = () => {
    Alert.alert(
      'Reset Weekly Time?',
      'This will reset your weekly art tracking to 00:00:00',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            clearInterval(weeklyIntervalRef.current);
            setIsWeeklyRunning(false);
            setWeeklyTime(0);
            saveWeeklyTime(0);
          }
        }
      ]
    );
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatStopwatch = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle art creation options
  const handleWrite = () => {
    Alert.alert('Write', 'Writing tool coming soon! For now, use your favorite writing app and come back to upload.');
  };

  const handleSketch = () => {
    Alert.alert('Sketch', 'Drawing tool coming soon! For now, use your favorite drawing app and come back to upload.');
  };

  const handleCapture = () => {
    Alert.alert('Capture', 'Photo capture coming soon! For now, take a photo and come back to upload.');
  };

  // Handle uploads
  const handlePrivateUpload = () => {
    Alert.alert(
      'Upload to Private Gallery',
      'Your artwork will be saved to your private gallery where only you can see it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upload', onPress: () => Alert.alert('Success!', 'Artwork saved to private gallery! 🎨') }
      ]
    );
  };

  const handleCourageUpload = () => {
    Alert.alert(
      'Upload with COURAGE',
      'Your artwork will be posted for community ranking. Are you ready to share your creativity?',
      [
        { text: 'Not Yet', style: 'cancel' },
        { text: 'Share!', onPress: () => Alert.alert('Courage!', 'Artwork posted for ranking! You\'re inspiring others! ✨') }
      ]
    );
  };

  // Check if weekly goal met (120 minutes)
  const weeklyGoalMet = weeklyTime >= 120 * 60;
  const weeklyProgress = Math.min((weeklyTime / (120 * 60)) * 100, 100);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Art Studio</Text>
        
        {/* Today's Challenge */}
        <View style={styles.challengeCard}>
          <Text style={styles.challengeLabel}>Today's Challenge:</Text>
          <Text style={styles.challengeText}>{todaysChallenge}</Text>
        </View>

        {/* Daily Timer (20 minutes) */}
        <View style={styles.timerCard}>
          <View style={styles.timerIcon}>
            <Text style={styles.timerEmoji}>⏱️</Text>
          </View>
          <Text style={styles.timerDisplay}>{formatTime(dailyTime)}</Text>
          <Text style={styles.timerLabel}>20 minute daily timer</Text>
          
          <View style={styles.timerButtons}>
            <TouchableOpacity 
              style={[styles.timerButton, isDailyRunning && styles.timerButtonStop]}
              onPress={toggleDailyTimer}
            >
              <Text style={styles.timerButtonText}>
                {isDailyRunning ? 'Pause' : 'Start'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.timerButtonSecondary}
              onPress={resetDailyTimer}
            >
              <Text style={styles.timerButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly Stopwatch */}
        <View style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyText}>
              120 min of art a week improves mental health
            </Text>
            {weeklyGoalMet && <Text style={styles.goalBadge}>✨ Goal Met!</Text>}
          </View>
          
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${weeklyProgress}%` }]} />
          </View>
          
          <View style={styles.timerIcon}>
            <Text style={styles.timerEmoji}>⏱️</Text>
          </View>
          <Text style={styles.stopwatchDisplay}>{formatStopwatch(weeklyTime)}</Text>
          <Text style={styles.stopwatchLabel}>weekly stopwatch</Text>
          
          <View style={styles.timerButtons}>
            <TouchableOpacity 
              style={[styles.timerButton, isWeeklyRunning && styles.timerButtonStop]}
              onPress={toggleWeeklyStopwatch}
            >
              <Text style={styles.timerButtonText}>
                {isWeeklyRunning ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.timerButtonSecondary}
              onPress={resetWeeklyStopwatch}
            >
              <Text style={styles.timerButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Creation Tools */}
        <View style={styles.toolsContainer}>
          <TouchableOpacity style={styles.toolButton} onPress={handleWrite}>
            <View style={styles.toolIconContainer}>
              <Text style={styles.toolIcon}>📝</Text>
            </View>
            <Text style={styles.toolLabel}>Write</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleSketch}>
            <View style={[styles.toolIconContainer, styles.sketchIcon]}>
              <Text style={styles.toolIcon}>✏️</Text>
            </View>
            <Text style={styles.toolLabel}>sketch</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleCapture}>
            <View style={styles.toolIconContainer}>
              <Text style={styles.toolIcon}>📷</Text>
            </View>
            <Text style={styles.toolLabel}>Capture</Text>
          </TouchableOpacity>
        </View>

        {/* Upload Buttons */}
        <View style={styles.uploadContainer}>
          <TouchableOpacity 
            style={styles.privateUploadButton}
            onPress={handlePrivateUpload}
          >
            <Text style={styles.uploadButtonText}>Upload to</Text>
            <Text style={styles.uploadButtonText}>private</Text>
            <Text style={styles.uploadButtonText}>gallery</Text>
            <Text style={styles.uploadButtonText}>ONLY</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.courageUploadButton}
            onPress={handleCourageUpload}
          >
            <Text style={styles.courageUploadText}>Upload</Text>
            <Text style={styles.courageUploadText}>COURAGE</Text>
          </TouchableOpacity>
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
  challengeCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  challengeLabel: {
    fontSize: 20,
    color: '#FFA500',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  challengeText: {
    fontSize: 32,
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timerCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  weeklyCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  weeklyText: {
    fontSize: 14,
    color: '#FFA500',
    textAlign: 'center',
    marginRight: 10,
  },
  goalBadge: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  timerIcon: {
    marginBottom: 10,
  },
  timerEmoji: {
    fontSize: 40,
  },
  timerDisplay: {
    fontSize: 56,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  timerLabel: {
    fontSize: 16,
    color: '#FFA500',
    marginBottom: 20,
  },
  stopwatchDisplay: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  stopwatchLabel: {
    fontSize: 16,
    color: '#FFA500',
    marginBottom: 20,
  },
  timerButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  timerButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  timerButtonStop: {
    backgroundColor: '#FF6B6B',
  },
  timerButtonSecondary: {
    backgroundColor: '#666',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  timerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  toolsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  toolButton: {
    alignItems: 'center',
  },
  toolIconContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  sketchIcon: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 8,
  },
  toolIcon: {
    fontSize: 48,
  },
  toolLabel: {
    fontSize: 18,
    color: '#FFA500',
    fontWeight: '600',
  },
  uploadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 15,
  },
  privateUploadButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  courageUploadButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  courageUploadText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

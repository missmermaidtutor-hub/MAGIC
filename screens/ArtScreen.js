import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import promptsData from '../prompts.json';

const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 180;

export default function ArtScreen() {
  // Daily timer (adjustable, default 20 minutes)
  const [timerSetting, setTimerSetting] = useState(20); // minutes
  const [dailyTime, setDailyTime] = useState(20 * 60); // seconds remaining
  const [isDailyRunning, setIsDailyRunning] = useState(false);
  
  // Weekly stopwatch
  const [weeklyTime, setWeeklyTime] = useState(0);
  const [isWeeklyRunning, setIsWeeklyRunning] = useState(false);
  
  // Challenge
  const [todaysChallenge, setTodaysChallenge] = useState('');

  // Art input modal
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [writeText, setWriteText] = useState('');
  const [writeMode, setWriteMode] = useState('write');
  
  // Alarm repeating state
  const [alarmRinging, setAlarmRinging] = useState(false);
  const alarmRepeatRef = useRef(null);

  // Refs for intervals
  const dailyIntervalRef = useRef(null);
  const weeklyIntervalRef = useRef(null);
  const alarmSoundRef = useRef(null);

  // End-time refs for background persistence
  const dailyEndTimeRef = useRef(null);   // timestamp when daily timer should finish
  const weeklyStartTimeRef = useRef(null); // timestamp when weekly stopwatch was started
  const weeklyBaseRef = useRef(0);         // accumulated weekly seconds before current run

  // Load saved weekly time on mount
  useEffect(() => {
    loadWeeklyTime();
    loadDailyChallenge();
    return () => {
      if (dailyIntervalRef.current) clearInterval(dailyIntervalRef.current);
      if (weeklyIntervalRef.current) clearInterval(weeklyIntervalRef.current);
      if (alarmRepeatRef.current) clearInterval(alarmRepeatRef.current);
      if (alarmSoundRef.current) {
        alarmSoundRef.current.unloadAsync();
      }
    };
  }, []);

  // Restore timers when tab is focused or app returns from background
  const syncTimers = () => {
    // Sync daily timer
    if (dailyEndTimeRef.current && isDailyRunning) {
      const remaining = Math.max(0, Math.round((dailyEndTimeRef.current - Date.now()) / 1000));
      if (remaining <= 0) {
        clearInterval(dailyIntervalRef.current);
        setIsDailyRunning(false);
        setDailyTime(0);
        dailyEndTimeRef.current = null;
        saveDailyArtTime(timerSetting * 60);
        startRepeatingAlarm();
        Alert.alert('Time\'s Up!', `${timerSetting} minutes of art time complete!\n\nBowl will chime every 5 minutes until stopped.`);
      } else {
        setDailyTime(remaining);
      }
    }
    // Sync weekly stopwatch
    if (weeklyStartTimeRef.current && isWeeklyRunning) {
      const elapsed = weeklyBaseRef.current + Math.round((Date.now() - weeklyStartTimeRef.current) / 1000);
      setWeeklyTime(elapsed);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      syncTimers();
    }, [isDailyRunning, isWeeklyRunning])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncTimers();
    });
    return () => sub.remove();
  }, [isDailyRunning, isWeeklyRunning]);

  // Play a single singing bowl chime
  const playSingleBowl = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: 1,
        shouldDuckAndroid: false,
        interruptionModeAndroid: 1,
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/singing-bowl.wav'),
        { shouldPlay: true, volume: 1.0 }
      );
      alarmSoundRef.current = sound;
      await sound.setVolumeAsync(1.0);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          alarmSoundRef.current = null;
        }
      });
    } catch (error) {
      console.log('Could not play singing bowl sound:', error);
    }
  };

  // Start repeating alarm — plays immediately, then every 5 minutes
  const startRepeatingAlarm = () => {
    playSingleBowl();
    setAlarmRinging(true);
    alarmRepeatRef.current = setInterval(() => {
      playSingleBowl();
    }, 5 * 60 * 1000); // every 5 minutes
  };

  // Stop the repeating alarm
  const stopAlarm = () => {
    if (alarmRepeatRef.current) {
      clearInterval(alarmRepeatRef.current);
      alarmRepeatRef.current = null;
    }
    if (alarmSoundRef.current) {
      alarmSoundRef.current.stopAsync().catch(() => {});
      alarmSoundRef.current.unloadAsync().catch(() => {});
      alarmSoundRef.current = null;
    }
    setAlarmRinging(false);
  };

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

  // Adjust timer setting
  const adjustTimer = (delta) => {
    if (isDailyRunning) return;
    const newVal = Math.max(MIN_TIMER_MINUTES, Math.min(MAX_TIMER_MINUTES, timerSetting + delta));
    setTimerSetting(newVal);
    setDailyTime(newVal * 60);
  };

  // Save daily timer elapsed time to mark art star point
  const saveDailyArtTime = async (elapsedSeconds) => {
    if (elapsedSeconds > 0) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const existing = await AsyncStorage.getItem(`art_time_${today}`);
        const total = (existing ? parseInt(existing) : 0) + elapsedSeconds;
        await AsyncStorage.setItem(`art_time_${today}`, total.toString());
      } catch (e) {}
    }
  };

  // Daily timer controls
  const toggleDailyTimer = () => {
    if (isDailyRunning) {
      clearInterval(dailyIntervalRef.current);
      setIsDailyRunning(false);
      dailyEndTimeRef.current = null;
      const elapsed = (timerSetting * 60) - dailyTime;
      saveDailyArtTime(elapsed);
    } else {
      dailyEndTimeRef.current = Date.now() + dailyTime * 1000;
      setIsDailyRunning(true);
      dailyIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((dailyEndTimeRef.current - Date.now()) / 1000));
        if (remaining <= 0) {
          clearInterval(dailyIntervalRef.current);
          setIsDailyRunning(false);
          setDailyTime(0);
          dailyEndTimeRef.current = null;
          saveDailyArtTime(timerSetting * 60);
          startRepeatingAlarm();
          Alert.alert('Time\'s Up!', `${timerSetting} minutes of art time complete!\n\nBowl will chime every 5 minutes until stopped.`);
        } else {
          setDailyTime(remaining);
        }
      }, 1000);
    }
  };

  const resetDailyTimer = () => {
    clearInterval(dailyIntervalRef.current);
    setIsDailyRunning(false);
    dailyEndTimeRef.current = null;
    stopAlarm();
    setDailyTime(timerSetting * 60);
  };

  // Fill art point for today + previous 7 days when stopwatch hits 120 min
  const fillArtRetroactive = async () => {
    try {
      const today = new Date();
      for (let i = 0; i < 8; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const existing = await AsyncStorage.getItem(`art_time_${dateStr}`);
        if (!existing || parseInt(existing) === 0) {
          await AsyncStorage.setItem(`art_time_${dateStr}`, '7200');
        }
      }
      Alert.alert('120 Minutes!', 'Art point filled for today and the past 7 days!');
    } catch (e) {}
  };

  // Weekly stopwatch controls
  const retroactiveFiredRef = useRef(false);
  const toggleWeeklyStopwatch = () => {
    if (isWeeklyRunning) {
      clearInterval(weeklyIntervalRef.current);
      setIsWeeklyRunning(false);
      const elapsed = weeklyBaseRef.current + Math.round((Date.now() - weeklyStartTimeRef.current) / 1000);
      weeklyBaseRef.current = elapsed;
      weeklyStartTimeRef.current = null;
      setWeeklyTime(elapsed);
      saveWeeklyTime(elapsed);
    } else {
      if (weeklyTime === 0) retroactiveFiredRef.current = false;
      weeklyBaseRef.current = weeklyTime;
      weeklyStartTimeRef.current = Date.now();
      setIsWeeklyRunning(true);
      weeklyIntervalRef.current = setInterval(() => {
        const elapsed = weeklyBaseRef.current + Math.round((Date.now() - weeklyStartTimeRef.current) / 1000);
        setWeeklyTime(elapsed);
        if (elapsed >= 7200 && !retroactiveFiredRef.current) {
          retroactiveFiredRef.current = true;
          fillArtRetroactive();
        }
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
            weeklyStartTimeRef.current = null;
            weeklyBaseRef.current = 0;
            setWeeklyTime(0);
            saveWeeklyTime(0);
          }
        }
      ]
    );
  };

  // Format time display
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Parse editable timer fields
  const [editHrs, setEditHrs] = useState('00');
  const [editMins, setEditMins] = useState('20');
  const [editSecs, setEditSecs] = useState('00');

  const applyEditedTime = () => {
    const h = Math.max(0, Math.min(3, parseInt(editHrs) || 0));
    const m = Math.max(0, Math.min(59, parseInt(editMins) || 0));
    const s = Math.max(0, Math.min(59, parseInt(editSecs) || 0));
    const total = h * 3600 + m * 60 + s;
    const clamped = Math.max(MIN_TIMER_MINUTES * 60, Math.min(MAX_TIMER_MINUTES * 60, total));
    setEditHrs(String(Math.floor(clamped / 3600)).padStart(2, '0'));
    setEditMins(String(Math.floor((clamped % 3600) / 60)).padStart(2, '0'));
    setEditSecs(String(clamped % 60).padStart(2, '0'));
    setTimerSetting(Math.ceil(clamped / 60));
    setDailyTime(clamped);
  };

  const formatStopwatch = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle art creation options
  const openArtModal = (mode) => {
    setWriteMode(mode);
    setWriteText('');
    setWriteModalVisible(true);
  };

  const handleWrite = () => openArtModal('write');

  const modeLabels = { write: 'Writing', sketch: 'Sketch', capture: 'Capture' };
  const modePlaceholders = {
    write: 'Start writing...',
    sketch: 'Describe your sketch or add notes...',
    capture: 'Describe what you captured or add notes...',
  };

  const saveWriteToPersonal = async () => {
    if (!writeText.trim()) {
      Alert.alert('Empty', 'Add something first!');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const label = modeLabels[writeMode] || 'Art';
      const artwork = {
        id: Date.now(),
        type: writeMode,
        text: writeText.trim(),
        artist: 'You',
        title: `${label} from ${today}`,
        prompt: todaysChallenge,
        date: today,
        isPublic: false
      };
      const existingRaw = await AsyncStorage.getItem('private_artworks');
      const artworks = existingRaw ? JSON.parse(existingRaw) : [];
      artworks.push(artwork);
      await AsyncStorage.setItem('private_artworks', JSON.stringify(artworks));
      // Mark art done for today
      const existing = await AsyncStorage.getItem(`art_time_${today}`);
      if (!existing || parseInt(existing) === 0) {
        await AsyncStorage.setItem(`art_time_${today}`, '1');
      }
      await AsyncStorage.setItem(`art_created_${today}`, 'true');
      setWriteModalVisible(false);
      Alert.alert('Saved!', `Your ${modeLabels[writeMode].toLowerCase()} has been saved to your personal gallery.`);
    } catch (e) {
      Alert.alert('Error', 'Could not save.');
    }
  };

  const saveWriteToCourage = async () => {
    if (!writeText.trim()) {
      Alert.alert('Empty', 'Add something first!');
      return;
    }
    Alert.alert(
      'Upload with COURAGE',
      `Your ${modeLabels[writeMode].toLowerCase()} will be submitted for voting. Ready to share?`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Share!',
          onPress: async () => {
            try {
              const today = new Date().toISOString().split('T')[0];
              const label = modeLabels[writeMode] || 'Art';
              const artwork = {
                id: Date.now(),
                type: writeMode,
                text: writeText.trim(),
                artist: 'Anonymous',
                title: todaysChallenge || `${label} from ${today}`,
                prompt: todaysChallenge,
                date: today,
                isPublic: false,
                pendingVoting: true,
                votingSubmitDate: today,
                rankings: []
              };
              // Save to voting queue
              const pendingRaw = await AsyncStorage.getItem('pending_voting_artworks');
              const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
              pending.push(artwork);
              await AsyncStorage.setItem('pending_voting_artworks', JSON.stringify(pending));
              // Also save to personal
              const personalRaw = await AsyncStorage.getItem('personal_artworks');
              const personal = personalRaw ? JSON.parse(personalRaw) : [];
              personal.push({ ...artwork, pendingVoting: true });
              await AsyncStorage.setItem('personal_artworks', JSON.stringify(personal));
              // Mark art done for today
              const existing = await AsyncStorage.getItem(`art_time_${today}`);
              if (!existing || parseInt(existing) === 0) {
                await AsyncStorage.setItem(`art_time_${today}`, '1');
              }
              await AsyncStorage.setItem(`art_created_${today}`, 'true');
              setWriteModalVisible(false);
              Alert.alert('Courage!', `${label} submitted for voting and saved to your personal gallery.`);
            } catch (e) {
              Alert.alert('Error', 'Could not upload writing.');
            }
          }
        }
      ]
    );
  };

  const handleSketch = () => openArtModal('sketch');

  const handleCapture = () => openArtModal('capture');

  // Simulate image selection (in real app, this would use image picker)
  const simulateImageSelection = () => {
    // Random sample images for demo
    const sampleImages = [
      'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1545551816-c691d80f8e31?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400&h=400&fit=crop'
    ];
    return sampleImages[Math.floor(Math.random() * sampleImages.length)];
  };

  // Handle uploads
  const handlePrivateUpload = async () => {
    try {
      const imageUrl = simulateImageSelection();
      const today = new Date().toISOString().split('T')[0];
      
      // Create artwork object
      const artwork = {
        id: Date.now(),
        imageUrl: imageUrl,
        artist: 'You',
        title: `Art from ${today}`,
        prompt: todaysChallenge,
        date: today,
        isPublic: false
      };

      // Save to private gallery
      const existingPrivate = await AsyncStorage.getItem('private_artworks');
      const privateArtworks = existingPrivate ? JSON.parse(existingPrivate) : [];
      privateArtworks.push(artwork);
      await AsyncStorage.setItem('private_artworks', JSON.stringify(privateArtworks));

      Alert.alert('Success!', 'Artwork saved to your private gallery! 🎨\n\nOnly you can see it.');
    } catch (error) {
      Alert.alert('Error', 'Could not save artwork');
    }
  };

  const handleCourageUpload = async () => {
    Alert.alert(
      'Upload with COURAGE',
      'Your artwork will be submitted for voting. It will appear in public galleries after voting day. Ready to share your creativity?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Share!',
          onPress: async () => {
            try {
              const imageUrl = simulateImageSelection();
              const today = new Date().toISOString().split('T')[0];

              // Create artwork object
              const artwork = {
                id: Date.now(),
                imageUrl: imageUrl,
                artist: 'Anonymous',
                title: `${todaysChallenge}`,
                prompt: todaysChallenge,
                date: today,
                isPublic: false,
                pendingVoting: true,
                votingSubmitDate: today,
                rankings: []
              };

              // Save to pending voting queue (held until after voting day)
              const existingPending = await AsyncStorage.getItem('pending_voting_artworks');
              const pendingArtworks = existingPending ? JSON.parse(existingPending) : [];
              pendingArtworks.push(artwork);
              await AsyncStorage.setItem('pending_voting_artworks', JSON.stringify(pendingArtworks));

              // Also save to personal gallery
              const existingPersonal = await AsyncStorage.getItem('personal_artworks');
              const personalArtworks = existingPersonal ? JSON.parse(existingPersonal) : [];
              personalArtworks.push({ ...artwork, pendingVoting: true });
              await AsyncStorage.setItem('personal_artworks', JSON.stringify(personalArtworks));

              Alert.alert('Courage!', 'Artwork submitted for voting! It will appear in public galleries after voting day.\n\nAlso saved to your private gallery.');
            } catch (error) {
              Alert.alert('Error', 'Could not upload artwork');
            }
          }
        }
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

        {/* Daily Timer (adjustable) */}
        <View style={styles.timerCard}>
          <View style={styles.timerIcon}>
            <Text style={styles.timerEmoji}>⏱️</Text>
          </View>

          {/* Editable HH:MM:SS input */}
          {!isDailyRunning && !alarmRinging ? (
            <View style={styles.timerInputRow}>
              <TextInput
                style={styles.timerInput}
                keyboardType="number-pad"
                value={editHrs}
                onChangeText={setEditHrs}
                onBlur={applyEditedTime}
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.timerColon}>:</Text>
              <TextInput
                style={styles.timerInput}
                keyboardType="number-pad"
                value={editMins}
                onChangeText={setEditMins}
                onBlur={applyEditedTime}
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.timerColon}>:</Text>
              <TextInput
                style={styles.timerInput}
                keyboardType="number-pad"
                value={editSecs}
                onChangeText={setEditSecs}
                onBlur={applyEditedTime}
                maxLength={2}
                selectTextOnFocus
              />
            </View>
          ) : (
            <Text style={styles.timerDisplay}>{formatTime(dailyTime)}</Text>
          )}

          <View style={styles.timerButtons}>
            {!alarmRinging ? (
              <>
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
              </>
            ) : (
              <TouchableOpacity
                style={styles.timerButtonAlarmStop}
                onPress={stopAlarm}
              >
                <Text style={styles.timerButtonText}>Stop Sound</Text>
              </TouchableOpacity>
            )}
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

      {/* Write Modal */}
      <Modal visible={writeModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.writeModalOverlay}
        >
          <View style={styles.writeModalCard}>
            <Text style={styles.writeModalTitle}>{modeLabels[writeMode] || 'Write'}</Text>
            <Text style={styles.writeModalPrompt}>{todaysChallenge}</Text>
            <TextInput
              style={styles.writeTextInput}
              multiline
              placeholder={modePlaceholders[writeMode] || 'Start writing...'}
              placeholderTextColor="#666"
              value={writeText}
              onChangeText={setWriteText}
              autoFocus
            />
            <View style={styles.writeButtonRow}>
              <TouchableOpacity style={styles.writePersonalBtn} onPress={saveWriteToPersonal}>
                <Text style={styles.writeBtnText}>Save to{'\n'}Personal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.writeCourageBtn} onPress={saveWriteToCourage}>
                <Text style={styles.writeBtnText}>Save to{'\n'}Courage</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.writeCloseBtn} onPress={() => setWriteModalVisible(false)}>
              <Text style={styles.writeCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    color: '#FF7F00',
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
  timerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  timerInput: {
    fontSize: 44,
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
    width: 70,
    paddingVertical: 4,
  },
  timerColon: {
    fontSize: 44,
    color: '#FFD700',
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  timerDisplay: {
    fontSize: 56,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  timerButtonAlarmStop: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 160,
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
  writeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  writeModalCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  writeModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF7F00',
    textAlign: 'center',
    marginBottom: 8,
  },
  writeModalPrompt: {
    fontSize: 16,
    color: '#FFA500',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  writeTextInput: {
    backgroundColor: '#0a0e27',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 10,
    color: '#fff',
    fontSize: 16,
    padding: 15,
    minHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  writeButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  writePersonalBtn: {
    flex: 1,
    backgroundColor: '#2a2a4a',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  writeCourageBtn: {
    flex: 1,
    backgroundColor: '#4a2a2a',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  writeBtnText: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  writeCloseBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  writeCloseBtnText: {
    color: '#888',
    fontSize: 16,
  },
});

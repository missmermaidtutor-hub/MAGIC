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
  AppState,
  ImageBackground,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import promptsData from '../prompts-data.json';
import { useAuth } from '../context/AuthContext';
import {
  getUserCourageForDate,
  uploadCourage,
  uploadMediaToStorage,
  getDailyPrompt,
  saveArtTime,
  saveArtwork,
} from '../services/firestoreService';
import { getESTDate } from '../utils/dateUtils';
import DrawingStudio from '../components/drawing/DrawingStudio';

const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 180;

export default function ArtScreen() {
  const { user, userProfile } = useAuth();
  const [courageUploadedToday, setCourageUploadedToday] = useState(false);

  // Daily timer (adjustable, default 20 minutes)
  const [timerSetting, setTimerSetting] = useState(5); // minutes
  const [dailyTime, setDailyTime] = useState(5 * 60); // seconds remaining
  const [isDailyRunning, setIsDailyRunning] = useState(false);
  
  // Weekly stopwatch
  const [weeklyTime, setWeeklyTime] = useState(0);
  const [isWeeklyRunning, setIsWeeklyRunning] = useState(false);
  
  // Challenge
  const [todaysChallenge, setTodaysChallenge] = useState('');
  const [todaysPromptData, setTodaysPromptData] = useState(null);
  const [nudgeModalVisible, setNudgeModalVisible] = useState(false);

  // Art input modal
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [writeText, setWriteText] = useState('');
  const [writeTitle, setWriteTitle] = useState('');
  const [writeMode, setWriteMode] = useState('write');

  // Drawing studio modal
  const [sketchModalVisible, setSketchModalVisible] = useState(false);

  // Capture modal
  const [captureModalVisible, setCaptureModalVisible] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  const [captureTitle, setCaptureTitle] = useState('');
  
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

  // Check if courage already uploaded today
  useEffect(() => {
    const checkCourage = async () => {
      if (user?.uid) {
        const existing = await getUserCourageForDate(user.uid, getESTDate());
        setCourageUploadedToday(!!existing);
      }
    };
    checkCourage();
  }, [user]);

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
      loadDailyChallenge();
    }, [isDailyRunning, isWeeklyRunning])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncTimers();
        loadDailyChallenge();
      }
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
      // Sync weekly stopwatch time to Firestore
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        const weekStart = getWeekStart(new Date());
        saveArtTime(user.uid, today, time, weekStart).catch(err =>
          console.log('Firestore weekly time sync error:', err)
        );
      }
    } catch (error) {
      console.log('Error saving weekly time:', error);
    }
  };

  // Load daily challenge — local prompts-data.json first, Firestore second
  const loadDailyChallenge = async () => {
    try {
      const today = getESTDate();
      const savedDate = await AsyncStorage.getItem('prompt_date');
      const savedChallenge = await AsyncStorage.getItem('todays_challenge');
      const savedPromptData = await AsyncStorage.getItem('todays_prompt_data');

      if (savedDate === today && savedChallenge && savedPromptData) {
        setTodaysChallenge(savedChallenge);
        setTodaysPromptData(JSON.parse(savedPromptData));
        return;
      }

      // Pick from local prompts-data.json by category rotation
      let chosen = null;
      const categories = [...new Set(promptsData.map(p => p.category))].sort();
      const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      const todaysCategory = categories[dayOfYear % categories.length];
      const categoryPrompts = promptsData.filter(p => p.category === todaysCategory);
      const pickIndex = Math.floor(dayOfYear / categories.length) % categoryPrompts.length;
      chosen = categoryPrompts[pickIndex];

      // Override with Firestore if available
      try {
        const firestorePrompt = await getDailyPrompt(today);
        if (firestorePrompt && firestorePrompt.prompt) {
          chosen = firestorePrompt;
        }
      } catch (e) {
        console.log('Firestore prompt fetch skipped:', e);
      }

      setTodaysChallenge(chosen.prompt);
      setTodaysPromptData(chosen);
      await AsyncStorage.setItem('prompt_date', today);
      await AsyncStorage.setItem('todays_challenge', chosen.prompt);
      await AsyncStorage.setItem('todays_prompt_data', JSON.stringify(chosen));
    } catch (error) {
      console.log('Error loading challenge:', error);
      const fallback = promptsData[0];
      setTodaysChallenge(fallback?.prompt || 'Create something beautiful');
      setTodaysPromptData(fallback || null);
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
        // Sync to Firestore
        if (user) {
          const weekStart = getWeekStart(new Date());
          saveArtTime(user.uid, today, total, weekStart).catch(err =>
            console.log('Firestore art time sync error:', err)
          );
        }
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
      const sessionElapsed = Math.round((Date.now() - weeklyStartTimeRef.current) / 1000);
      const elapsed = weeklyBaseRef.current + sessionElapsed;
      weeklyBaseRef.current = elapsed;
      weeklyStartTimeRef.current = null;
      setWeeklyTime(elapsed);
      saveWeeklyTime(elapsed);
      // Also record this session toward today's art star point
      if (sessionElapsed > 0) {
        saveDailyArtTime(sessionElapsed);
      }
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
  const [editMins, setEditMins] = useState('05');
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
        title: writeTitle.trim() || `${label} from ${today}`,
        prompt: todaysChallenge,
        date: today,
        isPublic: false
      };
      const existingRaw = await AsyncStorage.getItem('personal_artworks');
      const artworks = existingRaw ? JSON.parse(existingRaw) : [];
      artworks.push(artwork);
      await AsyncStorage.setItem('personal_artworks', JSON.stringify(artworks));
      // Mark art done for today
      const existing = await AsyncStorage.getItem(`art_time_${today}`);
      if (!existing || parseInt(existing) === 0) {
        await AsyncStorage.setItem(`art_time_${today}`, '1');
      }
      await AsyncStorage.setItem(`art_created_${today}`, 'true');
      // Sync to Firestore
      if (user) {
        saveArtwork(user.uid, artwork).catch(err =>
          console.log('Firestore artwork sync error:', err)
        );
      }
      setWriteModalVisible(false);
      setWriteTitle('');
      Alert.alert('Saved!', `Your ${modeLabels[writeMode].toLowerCase()} has been saved to your private gallery.`);
    } catch (e) {
      Alert.alert('Error', 'Could not save.');
    }
  };

  const saveWriteToCourage = async () => {
    if (!writeText.trim()) {
      Alert.alert('Empty', 'Add something first!');
      return;
    }
    if (courageUploadedToday) {
      Alert.alert('Already Submitted', 'You can only upload one Courage per day. Come back tomorrow!');
      return;
    }
    Alert.alert(
      'Upload with COURAGE',
      `Your ${modeLabels[writeMode].toLowerCase()} will be submitted for anonymous voting. Ready to share?`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Share!',
          onPress: async () => {
            const today = getESTDate();
            const label = modeLabels[writeMode] || 'Art';
            const title = writeTitle.trim() || todaysChallenge || `${label} from ${today}`;

            // Save to personal gallery locally first
            try {
              const personalRaw = await AsyncStorage.getItem('personal_artworks');
              const personal = personalRaw ? JSON.parse(personalRaw) : [];
              personal.push({
                id: Date.now(),
                type: writeMode,
                text: writeText.trim(),
                artist: 'You',
                title,
                date: today,
                isPublic: false,
                pendingVoting: true,
              });
              await AsyncStorage.setItem('personal_artworks', JSON.stringify(personal));

              // Mark art done for today
              await AsyncStorage.setItem(`art_created_${today}`, 'true');
              const existing = await AsyncStorage.getItem(`art_time_${today}`);
              if (!existing || parseInt(existing) === 0) {
                await AsyncStorage.setItem(`art_time_${today}`, '1');
              }
            } catch (localError) {
              console.log('Local save error:', localError);
            }

            // Mark as uploaded immediately so button disables
            setCourageUploadedToday(true);
            setWriteModalVisible(false);
            setWriteTitle('');

            // Now attempt Firestore upload
            try {
              await uploadCourage(user.uid, {
                pseudonym: userProfile?.pseudonym || '',
                title: `${title}: ${writeText.trim().substring(0, 200)}`,
                mediaType: 'image',
                mediaUrl: '',
                date: today,
                anonymous: userProfile?.anonymous ?? false,
              });

              Alert.alert('Congratulations on your COURAGE!', 'Upload is ready for tomorrow\'s vote.');
            } catch (e) {
              console.log('Courage text upload error:', e);
              Alert.alert(
                'Saved Locally',
                'Your work was saved to your gallery but could not be uploaded for voting. Check your connection and try again later.'
              );
            }
          }
        }
      ]
    );
  };

  // --- Drawing Studio save handlers ---

  const saveSketchToPersonal = async (imageUri, sketchTitle) => {
    try {
      const today = getESTDate();
      const artwork = {
        id: Date.now(),
        type: 'sketch',
        imageUrl: imageUri,
        artist: 'You',
        title: sketchTitle || `Sketch from ${today}`,
        prompt: todaysChallenge,
        date: today,
        isPublic: false,
      };
      const existingRaw = await AsyncStorage.getItem('personal_artworks');
      const artworks = existingRaw ? JSON.parse(existingRaw) : [];
      artworks.push(artwork);
      await AsyncStorage.setItem('personal_artworks', JSON.stringify(artworks));

      // Mark art done for today
      const existing = await AsyncStorage.getItem(`art_time_${today}`);
      if (!existing || parseInt(existing) === 0) {
        await AsyncStorage.setItem(`art_time_${today}`, '1');
      }
      await AsyncStorage.setItem(`art_created_${today}`, 'true');

      // Sync to Firestore
      if (user) {
        saveArtwork(user.uid, artwork).catch(err =>
          console.log('Firestore sketch sync error:', err)
        );
      }
      Alert.alert('Saved!', 'Your sketch has been saved to your private gallery.');
    } catch (e) {
      console.log('Sketch save error:', e);
      Alert.alert('Error', 'Could not save sketch.');
    }
  };

  const saveSketchToCourage = async (imageUri, sketchTitle) => {
    if (courageUploadedToday) {
      Alert.alert('Already Submitted', 'You can only upload one Courage per day.');
      return;
    }
    Alert.alert(
      'Upload with COURAGE',
      'Your sketch will be submitted for anonymous voting. Ready to share?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Share!',
          onPress: async () => {
            const today = getESTDate();
            const title = sketchTitle || `Sketch from ${today}`;

            // Save locally first
            try {
              const personalRaw = await AsyncStorage.getItem('personal_artworks');
              const personal = personalRaw ? JSON.parse(personalRaw) : [];
              personal.push({
                id: Date.now(),
                type: 'sketch',
                imageUrl: imageUri,
                artist: 'You',
                title,
                prompt: todaysChallenge,
                date: today,
                isPublic: false,
                pendingVoting: true,
              });
              await AsyncStorage.setItem('personal_artworks', JSON.stringify(personal));
              await AsyncStorage.setItem(`art_created_${today}`, 'true');
              const existing = await AsyncStorage.getItem(`art_time_${today}`);
              if (!existing || parseInt(existing) === 0) {
                await AsyncStorage.setItem(`art_time_${today}`, '1');
              }
            } catch (localError) {
              console.log('Local sketch save error:', localError);
            }

            setCourageUploadedToday(true);

            // Upload image to Firebase Storage, then create courage entry
            try {
              const storagePath = `courages/${user.uid}/${today}_sketch_${Date.now()}.png`;
              const downloadUrl = await uploadMediaToStorage(imageUri, storagePath);

              await uploadCourage(user.uid, {
                pseudonym: userProfile?.pseudonym || '',
                title: title,
                mediaType: 'image',
                mediaUrl: downloadUrl,
                date: today,
                anonymous: userProfile?.anonymous ?? false,
              });

              Alert.alert('Congratulations on your COURAGE!', 'Your sketch is ready for tomorrow\'s vote.');
            } catch (e) {
              console.log('Courage sketch upload error:', e);
              Alert.alert(
                'Saved Locally',
                'Your sketch was saved to your gallery but could not be uploaded for voting. Check your connection and try again later.'
              );
            }
          }
        }
      ]
    );
  };

  const handleSketch = () => setSketchModalVisible(true);

  // --- Capture flow ---

  const captureFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera access is required to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result || result.canceled || !result.assets || result.assets.length === 0) return;
      setCapturedImageUri(result.assets[0].uri);
      setCaptureTitle('');
      setCaptureModalVisible(true);
    } catch (err) {
      console.log('Camera error:', err);
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const captureFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result || result.canceled || !result.assets || result.assets.length === 0) return;
      setCapturedImageUri(result.assets[0].uri);
      setCaptureTitle('');
      setCaptureModalVisible(true);
    } catch (err) {
      console.log('Image picker error:', err);
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleCapture = () => {
    if (Platform.OS === 'web') {
      // Web: skip camera option, go straight to file picker
      captureFromLibrary();
    } else {
      Alert.alert('Capture', 'How would you like to capture?', [
        { text: 'Take Photo', onPress: captureFromCamera },
        { text: 'Choose from Library', onPress: captureFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const saveCaptureToPersonal = async () => {
    if (!capturedImageUri) return;
    try {
      const today = getESTDate();
      const artwork = {
        id: Date.now(),
        type: 'capture',
        imageUrl: capturedImageUri,
        artist: 'You',
        title: captureTitle.trim() || `Capture from ${today}`,
        prompt: todaysChallenge,
        date: today,
        isPublic: false,
      };
      const existingRaw = await AsyncStorage.getItem('personal_artworks');
      const artworks = existingRaw ? JSON.parse(existingRaw) : [];
      artworks.push(artwork);
      await AsyncStorage.setItem('personal_artworks', JSON.stringify(artworks));

      await AsyncStorage.setItem(`art_created_${today}`, 'true');
      const existing = await AsyncStorage.getItem(`art_time_${today}`);
      if (!existing || parseInt(existing) === 0) {
        await AsyncStorage.setItem(`art_time_${today}`, '1');
      }

      if (user) {
        saveArtwork(user.uid, artwork).catch(err =>
          console.log('Firestore capture sync error:', err)
        );
      }
      setCaptureModalVisible(false);
      Alert.alert('Saved!', 'Your capture has been saved to your private gallery.');
    } catch (e) {
      console.log('Capture save error:', e);
      Alert.alert('Error', 'Could not save capture.');
    }
  };

  const saveCaptureToCourage = async () => {
    if (!capturedImageUri) return;
    if (courageUploadedToday) {
      Alert.alert('Already Submitted', 'You can only upload one Courage per day.');
      return;
    }
    Alert.alert(
      'Upload with COURAGE',
      'Your capture will be submitted for anonymous voting. Ready to share?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Share!',
          onPress: async () => {
            const today = getESTDate();
            const title = captureTitle.trim() || `Capture from ${today}`;

            try {
              const personalRaw = await AsyncStorage.getItem('personal_artworks');
              const personal = personalRaw ? JSON.parse(personalRaw) : [];
              personal.push({
                id: Date.now(),
                type: 'capture',
                imageUrl: capturedImageUri,
                artist: 'You',
                title,
                date: today,
                isPublic: false,
                pendingVoting: true,
              });
              await AsyncStorage.setItem('personal_artworks', JSON.stringify(personal));
              await AsyncStorage.setItem(`art_created_${today}`, 'true');
              const existing = await AsyncStorage.getItem(`art_time_${today}`);
              if (!existing || parseInt(existing) === 0) {
                await AsyncStorage.setItem(`art_time_${today}`, '1');
              }
            } catch (localError) {
              console.log('Local capture save error:', localError);
            }

            setCourageUploadedToday(true);
            setCaptureModalVisible(false);

            try {
              const storagePath = `courages/${user.uid}/${today}_capture_${Date.now()}.png`;
              const downloadUrl = await uploadMediaToStorage(capturedImageUri, storagePath);

              await uploadCourage(user.uid, {
                pseudonym: userProfile?.pseudonym || '',
                title,
                mediaType: 'image',
                mediaUrl: downloadUrl,
                date: today,
                anonymous: userProfile?.anonymous ?? false,
              });

              Alert.alert('Congratulations on your COURAGE!', 'Your capture is ready for tomorrow\'s vote.');
            } catch (e) {
              console.log('Courage capture upload error:', e);
              Alert.alert(
                'Saved Locally',
                'Your capture was saved to your gallery but could not be uploaded for voting. Check your connection and try again later.'
              );
            }
          }
        }
      ]
    );
  };

  // Handle uploads (opens capture modal with image from library)
  const handlePrivateUpload = async () => {
    captureFromLibrary();
  };

  const handleCourageUpload = async () => {
    if (courageUploadedToday) {
      Alert.alert('Already Submitted', 'You can only upload one Courage per day. Come back tomorrow!');
      return;
    }
    // Opens capture modal — user can title + save from there
    captureFromLibrary();
  };

  // Check if weekly goal met (120 minutes)
  const weeklyGoalMet = weeklyTime >= 120 * 60;
  const weeklyProgress = Math.min((weeklyTime / (120 * 60)) * 100, 100);

  return (
    <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Art Studio</Text>
        
        {/* Today's Challenge */}
        <View style={styles.challengeCard}>
          <Text style={styles.challengeLabel}>Be Creative:</Text>
          <Text style={styles.challengeText}>{todaysChallenge}</Text>
          <TouchableOpacity onPress={() => setNudgeModalVisible(true)}>
            <Text style={styles.nudgeLink}>Click for a nudge</Text>
          </TouchableOpacity>
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
            style={styles.privateUploadButton}
            onPress={handlePrivateUpload}
          >
            <Text style={styles.uploadButtonText}>SHARE WITH</Text>
            <Text style={styles.uploadButtonText}>COURAGE</Text>
            <Text style={styles.uploadButtonText}>(voting)</Text>
            <Text style={styles.uploadButtonText}>once per day</Text>
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
            <TouchableOpacity style={styles.modalXButton} onPress={() => setWriteModalVisible(false)}>
              <Text style={styles.modalXText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.writeModalTitle}>{modeLabels[writeMode] || 'Write'}</Text>
            <Text style={styles.writeModalPrompt}>{todaysChallenge}</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Title your work (optional)"
              placeholderTextColor="#888"
              value={writeTitle}
              onChangeText={setWriteTitle}
              maxLength={100}
            />
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

      {/* Nudge Modal */}
      <Modal visible={nudgeModalVisible} transparent animationType="fade">
        <View style={styles.nudgeOverlay}>
          <View style={styles.nudgeCard}>
            <TouchableOpacity style={styles.modalXButton} onPress={() => setNudgeModalVisible(false)}>
              <Text style={styles.modalXText}>✕</Text>
            </TouchableOpacity>
            {todaysPromptData?.encouragement ? (
              <Text style={styles.nudgeEncouragement}>{todaysPromptData.encouragement}</Text>
            ) : null}
            {todaysPromptData?.explained ? (
              <Text style={styles.nudgeExplained}>{todaysPromptData.explained}</Text>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Capture Preview Modal */}
      <Modal visible={captureModalVisible} transparent animationType="slide">
        <View style={styles.captureOverlay}>
          <View style={styles.captureCard}>
            <TouchableOpacity style={styles.modalXButton} onPress={() => setCaptureModalVisible(false)}>
              <Text style={styles.modalXText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.captureModalTitle}>Your Capture</Text>
            {capturedImageUri && (
              <View style={styles.capturePreviewWrap}>
                <Image
                  source={{ uri: capturedImageUri }}
                  style={styles.capturePreview}
                  resizeMode="contain"
                />
              </View>
            )}
            <TextInput
              style={styles.titleInput}
              placeholder="Title your work (optional)"
              placeholderTextColor="#888"
              value={captureTitle}
              onChangeText={setCaptureTitle}
              maxLength={100}
            />
            <View style={styles.writeButtonRow}>
              <TouchableOpacity style={styles.writePersonalBtn} onPress={saveCaptureToPersonal}>
                <Text style={styles.writeBtnText}>Save to{'\n'}Personal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.writeCourageBtn, courageUploadedToday && { opacity: 0.4 }]}
                onPress={saveCaptureToCourage}
                disabled={courageUploadedToday}
              >
                <Text style={styles.writeBtnText}>
                  {courageUploadedToday ? 'Courage\nSent' : 'Share as\nCourage'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.writeCloseBtn} onPress={() => setCaptureModalVisible(false)}>
              <Text style={styles.writeCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Drawing Studio */}
      <DrawingStudio
        visible={sketchModalVisible}
        onClose={() => setSketchModalVisible(false)}
        onSaveToPersonal={saveSketchToPersonal}
        onSaveToCourage={saveSketchToCourage}
        prompt={todaysChallenge}
        courageUploadedToday={courageUploadedToday}
      />
    </ImageBackground>
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
    color: '#F3CB82',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  challengeCard: {
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 3,
    borderColor: '#f2990a',
    borderRadius: 12,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  challengeLabel: {
    fontSize: 20,
    color: '#332100',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  challengeText: {
    fontSize: 32,
    color: '#332100',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timerCard: {
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 3,
    borderColor: '#f2990a',
    borderRadius: 12,
    padding: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  weeklyCard: {
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 3,
    borderColor: '#f2990a',
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
    color: '#332100',
    textAlign: 'center',
    marginRight: 10,
  },
  goalBadge: {
    fontSize: 16,
    color: '#332100',
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
    backgroundColor: '#f2990a',
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
    color: '#332100',
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#332100',
    width: 70,
    paddingVertical: 4,
  },
  timerColon: {
    fontSize: 44,
    color: '#332100',
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  timerDisplay: {
    fontSize: 56,
    color: '#332100',
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
    color: '#332100',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  stopwatchLabel: {
    fontSize: 16,
    color: '#332100',
    marginBottom: 20,
  },
  timerButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  timerButton: {
    backgroundColor: '#f2990a',
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
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  sketchIcon: {
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 3,
    borderColor: '#f2990a',
    borderRadius: 8,
  },
  toolIcon: {
    fontSize: 48,
  },
  toolLabel: {
    fontSize: 18,
    color: '#332100',
    fontWeight: '600',
  },
  uploadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 15,
  },
  privateUploadButton: {
    flex: 1,
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 3,
    borderColor: '#f2990a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  courageUploadButton: {
    flex: 1,
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 3,
    borderColor: '#f2990a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courageUploadButtonDone: {
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
    borderColor: '#999',
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#332100',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  courageUploadText: {
    color: '#332100',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  courageSubtext: {
    color: '#332100',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  writeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  writeModalCard: {
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 3,
    borderColor: '#f2990a',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    position: 'relative',
  },
  modalXButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f7bc6e',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalXText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  writeModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#332100',
    textAlign: 'center',
    marginBottom: 8,
  },
  writeModalPrompt: {
    fontSize: 16,
    color: '#332100',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  titleInput: {
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 2,
    borderColor: '#f7bc6e',
    borderRadius: 10,
    color: '#332100',
    fontSize: 15,
    padding: 10,
    marginBottom: 10,
  },
  writeTextInput: {
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 2,
    borderColor: '#f7bc6e',
    borderRadius: 10,
    color: '#332100',
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
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 2,
    borderColor: '#f2990a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  writeCourageBtn: {
    flex: 1,
    backgroundColor: 'rgba(243, 203, 130, 0.5)',
    borderWidth: 2,
    borderColor: '#f2990a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  writeBtnText: {
    color: '#332100',
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
    color: '#ffffff',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  captureOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  captureCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    maxHeight: '90%',
  },
  captureModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 12,
  },
  capturePreviewWrap: {
    width: '100%',
    maxHeight: 250,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturePreview: {
    width: '100%',
    height: 250,
  },
  nudgeLink: {
    fontSize: 14,
    color: '#332100',
    fontStyle: 'italic',
    marginTop: 12,
    textDecorationLine: 'underline',
  },
  nudgeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  nudgeCard: {
    backgroundColor: 'rgba(243, 203, 130, 0.95)',
    borderWidth: 3,
    borderColor: '#f2990a',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  nudgeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#332100',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  nudgeEncouragement: {
    fontSize: 18,
    color: '#5a3800',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  nudgeExplained: {
    fontSize: 16,
    color: '#332100',
    textAlign: 'center',
    lineHeight: 24,
  },
});

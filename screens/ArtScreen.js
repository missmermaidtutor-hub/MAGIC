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
  Switch,
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
import { showAlert, showConfirm, showDestructiveConfirm } from '../utils/alertUtils';
import { persistImageUri } from '../utils/imageUtils';
import { captureError } from '../config/sentry';
import { trackAction } from '../services/analyticsService';
import DrawingStudio from '../components/drawing/DrawingStudio';

const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 180;

const FONT_FAMILIES = [
  { label: 'Default', value: null },
  { label: 'Serif', value: 'serif' },
  { label: 'Sans', value: 'sans-serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Cursive', value: Platform.OS === 'web' ? 'cursive' : 'serif' },
  { label: 'Georgia', value: Platform.OS === 'web' ? 'Georgia, serif' : 'Georgia' },
];
const FONT_SIZES = [
  { label: 'S', value: 13 },
  { label: 'M', value: 16 },
  { label: 'L', value: 20 },
  { label: 'XL', value: 26 },
];
const TEXT_COLORS = [
  '#332100', '#000000', '#FFFFFF', '#DC143C', '#FF7F00',
  '#FFD700', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
];

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
  const [textStyle, setTextStyle] = useState({
    fontFamily: null,
    fontSize: 16,
    color: '#332100',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecorationLine: 'none',
    textAlign: 'left',
  });

  // Drawing studio modal
  const [sketchModalVisible, setSketchModalVisible] = useState(false);

  // Capture modal
  const [captureModalVisible, setCaptureModalVisible] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  const [captureTitle, setCaptureTitle] = useState('');
  
  // Alarm repeating state
  const [alarmRinging, setAlarmRinging] = useState(false);
  const [timerDoneModalVisible, setTimerDoneModalVisible] = useState(false);
  const alarmRepeatRef = useRef(null);

  // Courage confirmation modal
  const [courageConfirmVisible, setCourageConfirmVisible] = useState(false);
  const [courageOverrideAnonymous, setCourageOverrideAnonymous] = useState(true);
  const pendingCourageUploadRef = useRef(null);

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
        setTimerDoneModalVisible(true);
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
    // Web: listen for tab visibility change (catches midnight rollover in open browser tab)
    const handleVisibility = () => {
      if (Platform.OS === 'web' && document.visibilityState === 'visible') {
        loadDailyChallenge();
      }
    };
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    return () => {
      sub.remove();
      if (Platform.OS === 'web') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
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
        require('../assets/bird-alarm.mp3'),
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
    setTimerDoneModalVisible(false);
  };

  // Timer done: reset to current setting and restart
  const handleTimerRestart = () => {
    stopAlarm();
    setDailyTime(timerSetting * 60);
  };

  // Timer done: close completely (stop alarm, leave timer at 0)
  const handleTimerClose = () => {
    stopAlarm();
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

  // Get start of current week (Monday) in EST
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    return getESTDate(monday);
  };

  // Save weekly time
  const saveWeeklyTime = async (time) => {
    try {
      await AsyncStorage.setItem('weekly_art_time', time.toString());
      // Sync weekly stopwatch time to Firestore
      if (user) {
        const today = getESTDate();
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
      const savedDate = await AsyncStorage.getItem('prompt_date_v2');
      const savedChallenge = await AsyncStorage.getItem('todays_challenge');
      const savedPromptData = await AsyncStorage.getItem('todays_prompt_data');

      if (savedDate === today && savedChallenge && savedPromptData) {
        setTodaysChallenge(savedChallenge);
        setTodaysPromptData(JSON.parse(savedPromptData));
        return;
      }

      // Pick from local prompts-data.json by category rotation (using EST date)
      let chosen = null;
      const categories = [...new Set(promptsData.map(p => p.category))].sort();
      const estDate = new Date(today + 'T12:00:00'); // parse EST date at noon to avoid timezone edge
      const dayOfYear = Math.floor((estDate - new Date(estDate.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
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
      await AsyncStorage.setItem('prompt_date_v2', today);
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
        const today = getESTDate();
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
      trackAction('art_timer_stopped');
    } else {
      dailyEndTimeRef.current = Date.now() + dailyTime * 1000;
      setIsDailyRunning(true);
      trackAction('art_timer_started');
      dailyIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((dailyEndTimeRef.current - Date.now()) / 1000));
        if (remaining <= 0) {
          clearInterval(dailyIntervalRef.current);
          setIsDailyRunning(false);
          setDailyTime(0);
          dailyEndTimeRef.current = null;
          saveDailyArtTime(timerSetting * 60);
          startRepeatingAlarm();
          setTimerDoneModalVisible(true);
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
        const dateStr = getESTDate(d);
        const existing = await AsyncStorage.getItem(`art_time_${dateStr}`);
        if (!existing || parseInt(existing) === 0) {
          await AsyncStorage.setItem(`art_time_${dateStr}`, '7200');
        }
      }
      showAlert('120 Minutes!', 'Art point filled for today and the past 7 days!');
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
    showDestructiveConfirm(
      'Reset Weekly Time?',
      'This will reset your weekly art tracking to 00:00:00',
      () => {
        clearInterval(weeklyIntervalRef.current);
        setIsWeeklyRunning(false);
        weeklyStartTimeRef.current = null;
        weeklyBaseRef.current = 0;
        setWeeklyTime(0);
        saveWeeklyTime(0);
      },
      'Reset'
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
    setTextStyle({
      fontFamily: null, fontSize: 16, color: '#332100',
      fontWeight: 'normal', fontStyle: 'normal',
      textDecorationLine: 'none', textAlign: 'left',
    });
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
      showAlert('Empty', 'Add something first!');
      return;
    }
    try {
      const today = getESTDate();
      const label = modeLabels[writeMode] || 'Art';
      const artwork = {
        id: Date.now(),
        type: writeMode,
        text: writeText.trim(),
        artist: 'You',
        title: writeTitle.trim() || `${label} from ${today}`,
        prompt: todaysChallenge,
        date: today,
        isPublic: false,
        textStyle,
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
      showAlert('Saved!', `Your ${modeLabels[writeMode].toLowerCase()} has been saved to your private gallery.`);
    } catch (e) {
      showAlert('Error', 'Could not save.');
    }
  };

  const saveWriteToCourage = async () => {
    if (!writeText.trim()) {
      showAlert('Empty', 'Add something first!');
      return;
    }
    if (user && !user.emailVerified) {
      showAlert('Verify Email', 'Please verify your email before sharing with the community. Check your inbox for a verification link.');
      return;
    }
    if (courageUploadedToday) {
      showAlert('Already Submitted', 'You can only upload one Courage per day. Come back tomorrow!');
      return;
    }
    const doUpload = async (isAnonymous) => {
      const today = getESTDate();
      const label = modeLabels[writeMode] || 'Art';
      const title = writeTitle.trim() || todaysChallenge || `${label} from ${today}`;

      // Save to pending voting (NOT private gallery — releases after ranking)
      const artworkId = Date.now();
      try {
        const pendingRaw = await AsyncStorage.getItem('pending_voting_artworks');
        const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
        pending.push({
          id: artworkId,
          type: writeMode,
          text: writeText.trim(),
          artist: 'You',
          title,
          date: today,
          votingSubmitDate: today,
          isPublic: false,
          pendingVoting: true,
          textStyle,
        });
        await AsyncStorage.setItem('pending_voting_artworks', JSON.stringify(pending));

        // Mark art done for today
        await AsyncStorage.setItem(`art_created_${today}`, 'true');
        const existing = await AsyncStorage.getItem(`art_time_${today}`);
        if (!existing || parseInt(existing) === 0) {
          await AsyncStorage.setItem(`art_time_${today}`, '1');
        }
      } catch (localError) {
        console.log('Local save error:', localError);
      }

      trackAction('courage_uploaded_write');
      setWriteTitle('');

      // Attempt Firestore upload
      try {
        await uploadCourage(user.uid, {
          pseudonym: userProfile?.pseudonym || '',
          title,
          text: writeText.trim(),
          mediaType: 'text',
          mediaUrl: '',
          date: today,
          anonymous: isAnonymous,
          textStyle,
        });

        setCourageUploadedToday(true);
        await AsyncStorage.setItem(`courage_uploaded_${today}`, 'true');

        // Persist to Firestore so it survives across sessions/devices (still pending)
        saveArtwork(user.uid, {
          type: writeMode,
          text: writeText.trim(),
          artist: 'You',
          title,
          date: today,
          isPublic: false,
          pendingVoting: true,
          textStyle,
        }).catch(err => console.log('Firestore artwork backup error:', err));

        const successMsg = isAnonymous
          ? 'Your Courage has been registered for Ranking tomorrow. It will remain anonymous even after ranking is complete.'
          : 'Your Courage has been registered for Ranking tomorrow. When ranking is over, your Courage will also show your pseudonym in Winner Circle, and galleries.';
        showAlert('Congratulations on your COURAGE!', successMsg);
      } catch (e) {
        console.log('Courage text upload error:', e);
        captureError(e, { context: 'courageTextUpload' });
        showAlert(
          'Saved Locally',
          'Your work was saved to your gallery but could not be uploaded for ranking. Check your connection and try again later.'
        );
      }
    };
    setCourageOverrideAnonymous(userProfile?.anonymous ?? true);
    pendingCourageUploadRef.current = doUpload;
    setWriteModalVisible(false);
    setCourageConfirmVisible(true);
  };

  // --- Drawing Studio save handlers ---

  const saveSketchToPersonal = async (imageUri, sketchTitle) => {
    try {
      const today = getESTDate();

      // Mark art done for today FIRST so star always credits
      await AsyncStorage.setItem(`art_created_${today}`, 'true');
      const existingTime = await AsyncStorage.getItem(`art_time_${today}`);
      if (!existingTime || parseInt(existingTime) === 0) {
        await AsyncStorage.setItem(`art_time_${today}`, '1');
      }

      const artworkId = Date.now();
      const persistedUri = await persistImageUri(imageUri, user?.uid, String(artworkId));
      const artwork = {
        id: artworkId,
        type: 'sketch',
        imageUrl: persistedUri,
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

      // Sync to Firestore
      if (user) {
        saveArtwork(user.uid, artwork).catch(err =>
          console.log('Firestore sketch sync error:', err)
        );
      }
      trackAction('sketch_saved');
      showAlert('Saved!', 'Your sketch has been saved to your private gallery.');
    } catch (e) {
      console.log('Sketch save error:', e);
      captureError(e, { context: 'saveSketchToPersonal' });
      showAlert('Error', 'Could not save sketch.');
    }
  };

  const saveSketchToCourage = async (imageUri, sketchTitle) => {
    if (user && !user.emailVerified) {
      showAlert('Verify Email', 'Please verify your email before sharing with the community. Check your inbox for a verification link.');
      return;
    }
    if (courageUploadedToday) {
      showAlert('Already Submitted', 'You can only upload one Courage per day.');
      return;
    }
    const doUpload = async (isAnonymous) => {
      const today = getESTDate();
      const title = sketchTitle || `Sketch from ${today}`;

      // Mark art done for today FIRST so star always credits
      await AsyncStorage.setItem(`art_created_${today}`, 'true');
      const existingTime = await AsyncStorage.getItem(`art_time_${today}`);
      if (!existingTime || parseInt(existingTime) === 0) {
        await AsyncStorage.setItem(`art_time_${today}`, '1');
      }

      const artworkId = Date.now();
      const persistedUri = await persistImageUri(imageUri, user?.uid, String(artworkId));

      // Save to pending voting (NOT private gallery — releases after ranking)
      try {
        const pendingRaw = await AsyncStorage.getItem('pending_voting_artworks');
        const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
        pending.push({
          id: artworkId,
          type: 'sketch',
          imageUrl: persistedUri,
          artist: 'You',
          title,
          prompt: todaysChallenge,
          date: today,
          votingSubmitDate: today,
          isPublic: false,
          pendingVoting: true,
        });
        await AsyncStorage.setItem('pending_voting_artworks', JSON.stringify(pending));
      } catch (localError) {
        console.log('Local sketch save error:', localError);
      }

      trackAction('courage_uploaded_sketch');

      // Try uploading image to Firebase Storage
      let downloadUrl = '';
      try {
        const storagePath = `courages/${user.uid}/${today}_sketch_${Date.now()}.png`;
        downloadUrl = await uploadMediaToStorage(imageUri, storagePath);
      } catch (storageErr) {
        console.log('Storage upload failed, submitting without image:', storageErr);
      }

      // Upload courage entry to Firestore (with or without image URL)
      try {
        await uploadCourage(user.uid, {
          pseudonym: userProfile?.pseudonym || '',
          title: title,
          mediaType: 'image',
          mediaUrl: downloadUrl,
          date: today,
          anonymous: isAnonymous,
        });

        setCourageUploadedToday(true);
        await AsyncStorage.setItem(`courage_uploaded_${today}`, 'true');

        // Persist to Firestore so it survives across sessions/devices (still pending)
        saveArtwork(user.uid, {
          type: 'sketch',
          imageUrl: persistedUri,
          artist: 'You',
          title,
          prompt: todaysChallenge,
          date: today,
          isPublic: false,
          pendingVoting: true,
        }).catch(err => console.log('Firestore artwork backup error:', err));

        const successMsg = isAnonymous
          ? 'Your Courage has been registered for Ranking tomorrow. It will remain anonymous even after ranking is complete.'
          : 'Your Courage has been registered for Ranking tomorrow. When ranking is over, your Courage will also show your pseudonym in Winner Circle, and galleries.';
        showAlert('Congratulations on your COURAGE!', successMsg);
      } catch (e) {
        console.log('Courage sketch upload error:', e);
        captureError(e, { context: 'courageSketchUpload' });
        showAlert(
          'Saved Locally',
          'Your sketch was saved to your gallery but could not be uploaded for ranking. Check your connection and try again later.'
        );
      }
    };
    setCourageOverrideAnonymous(userProfile?.anonymous ?? true);
    pendingCourageUploadRef.current = doUpload;
    setCourageConfirmVisible(true);
  };

  const handleSketch = () => {
    trackAction('sketch_started');
    setSketchModalVisible(true);
  };

  // --- Capture flow ---

  const captureFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Needed', 'Camera access is required to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result || result.canceled || !result.assets || result.assets.length === 0) return;
      setCapturedImageUri(result.assets[0].uri);
      setCaptureTitle('');
      setCaptureModalVisible(true);
    } catch (err) {
      console.log('Camera error:', err);
      showAlert('Error', 'Could not open camera.');
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
      showAlert('Error', 'Could not open image picker.');
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

      // Mark art done for today FIRST so star always credits
      await AsyncStorage.setItem(`art_created_${today}`, 'true');
      const existingTime = await AsyncStorage.getItem(`art_time_${today}`);
      if (!existingTime || parseInt(existingTime) === 0) {
        await AsyncStorage.setItem(`art_time_${today}`, '1');
      }

      const artworkId = Date.now();
      const persistedUri = await persistImageUri(capturedImageUri, user?.uid, String(artworkId));
      const artwork = {
        id: artworkId,
        type: 'capture',
        imageUrl: persistedUri,
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

      if (user) {
        saveArtwork(user.uid, artwork).catch(err =>
          console.log('Firestore capture sync error:', err)
        );
      }
      setCaptureModalVisible(false);
      showAlert('Saved!', 'Your capture has been saved to your private gallery.');
    } catch (e) {
      console.log('Capture save error:', e);
      captureError(e, { context: 'saveCaptureToPersonal' });
      showAlert('Error', 'Could not save capture.');
    }
  };

  const saveCaptureToCourage = async () => {
    if (!capturedImageUri) return;
    if (user && !user.emailVerified) {
      showAlert('Verify Email', 'Please verify your email before sharing with the community. Check your inbox for a verification link.');
      return;
    }
    if (courageUploadedToday) {
      showAlert('Already Submitted', 'You can only upload one Courage per day.');
      return;
    }
    const doUpload = async (isAnonymous) => {
      const today = getESTDate();
      const title = captureTitle.trim() || `Capture from ${today}`;

      // Mark art done for today FIRST so star always credits
      await AsyncStorage.setItem(`art_created_${today}`, 'true');
      const existingTime = await AsyncStorage.getItem(`art_time_${today}`);
      if (!existingTime || parseInt(existingTime) === 0) {
        await AsyncStorage.setItem(`art_time_${today}`, '1');
      }

      const artworkId = Date.now();
      const persistedUri = await persistImageUri(capturedImageUri, user?.uid, String(artworkId));

      // Save to pending voting (NOT private gallery — releases after ranking)
      try {
        const pendingRaw = await AsyncStorage.getItem('pending_voting_artworks');
        const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
        pending.push({
          id: artworkId,
          type: 'capture',
          imageUrl: persistedUri,
          artist: 'You',
          title,
          date: today,
          votingSubmitDate: today,
          isPublic: false,
          pendingVoting: true,
        });
        await AsyncStorage.setItem('pending_voting_artworks', JSON.stringify(pending));
      } catch (localError) {
        console.log('Local capture save error:', localError);
      }

      trackAction('courage_uploaded_capture');
      setCaptureModalVisible(false);

      // Try uploading image to Firebase Storage
      let downloadUrl = '';
      try {
        const storagePath = `courages/${user.uid}/${today}_capture_${Date.now()}.png`;
        downloadUrl = await uploadMediaToStorage(capturedImageUri, storagePath);
      } catch (storageErr) {
        console.log('Storage upload failed, submitting without image:', storageErr);
      }

      // Upload courage entry to Firestore (with or without image URL)
      try {
        await uploadCourage(user.uid, {
          pseudonym: userProfile?.pseudonym || '',
          title,
          mediaType: 'image',
          mediaUrl: downloadUrl,
          date: today,
          anonymous: isAnonymous,
        });

        setCourageUploadedToday(true);
        await AsyncStorage.setItem(`courage_uploaded_${today}`, 'true');

        // Persist to Firestore so it survives across sessions/devices (still pending)
        saveArtwork(user.uid, {
          type: 'capture',
          imageUrl: persistedUri,
          artist: 'You',
          title,
          date: today,
          isPublic: false,
          pendingVoting: true,
        }).catch(err => console.log('Firestore artwork backup error:', err));

        const successMsg = isAnonymous
          ? 'Your Courage has been registered for Ranking tomorrow. It will remain anonymous even after ranking is complete.'
          : 'Your Courage has been registered for Ranking tomorrow. When ranking is over, your Courage will also show your pseudonym in Winner Circle, and galleries.';
        showAlert('Congratulations on your COURAGE!', successMsg);
      } catch (e) {
        console.log('Courage capture upload error:', e);
        captureError(e, { context: 'courageCaptureUpload' });
        showAlert(
          'Saved Locally',
          'Your capture was saved to your gallery but could not be uploaded for ranking. Check your connection and try again later.'
        );
      }
    };
    setCourageOverrideAnonymous(userProfile?.anonymous ?? true);
    pendingCourageUploadRef.current = doUpload;
    setCourageConfirmVisible(true);
  };


  // Courage confirmation modal handlers
  const handleCourageConfirm = () => {
    setCourageConfirmVisible(false);
    if (pendingCourageUploadRef.current) {
      pendingCourageUploadRef.current(courageOverrideAnonymous);
      pendingCourageUploadRef.current = null;
    }
  };

  const handleCourageCancel = () => {
    setCourageConfirmVisible(false);
    pendingCourageUploadRef.current = null;
    // Re-open write modal if the user had text in progress
    if (writeText.trim()) {
      setWriteModalVisible(true);
    }
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

        {/* Timer & Stopwatch Side by Side */}
        <View style={styles.timerRow}>
          {/* Daily Timer */}
          <View style={styles.timerCardHalf}>
            <Text style={styles.halfLabel}>Timer</Text>

            {!isDailyRunning && !alarmRinging ? (
              <View style={styles.halfInputRow}>
                <TextInput
                  style={styles.halfInput}
                  keyboardType="number-pad"
                  value={editHrs}
                  onChangeText={setEditHrs}
                  onBlur={applyEditedTime}
                  maxLength={2}
                  selectTextOnFocus
                />
                <Text style={styles.halfColon}>:</Text>
                <TextInput
                  style={styles.halfInput}
                  keyboardType="number-pad"
                  value={editMins}
                  onChangeText={setEditMins}
                  onBlur={applyEditedTime}
                  maxLength={2}
                  selectTextOnFocus
                />
                <Text style={styles.halfColon}>:</Text>
                <TextInput
                  style={styles.halfInput}
                  keyboardType="number-pad"
                  value={editSecs}
                  onChangeText={setEditSecs}
                  onBlur={applyEditedTime}
                  maxLength={2}
                  selectTextOnFocus
                />
              </View>
            ) : (
              <Text style={styles.halfDisplay}>{formatTime(dailyTime)}</Text>
            )}

            <View style={styles.halfButtons}>
              {!alarmRinging ? (
                <>
                  <TouchableOpacity
                    style={[styles.halfBtn, isDailyRunning && styles.halfBtnStop]}
                    onPress={toggleDailyTimer}
                  >
                    <Text style={styles.halfBtnText}>
                      {isDailyRunning ? 'Pause' : 'Start'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.halfBtn, styles.halfBtnSecondary]}
                    onPress={resetDailyTimer}
                  >
                    <Text style={styles.halfBtnText}>Reset</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.halfBtn, styles.halfBtnStop]}
                  onPress={stopAlarm}
                >
                  <Text style={styles.halfBtnText}>Stop</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.halfHint}>
              Use for meditation{'\n'}Race the clock to complete your art challenge{'\n'}Limit the time you spend on this app
            </Text>
          </View>

          {/* Weekly Stopwatch */}
          <View style={styles.timerCardHalf}>
            <Text style={styles.halfLabel}>Stopwatch</Text>
            <Text style={styles.halfDisplay}>{formatStopwatch(weeklyTime)}</Text>
            <Text style={styles.halfSublabel}>weekly</Text>

            <View style={styles.halfButtons}>
              <TouchableOpacity
                style={[styles.halfBtn, isWeeklyRunning && styles.halfBtnStop]}
                onPress={toggleWeeklyStopwatch}
              >
                <Text style={styles.halfBtnText}>
                  {isWeeklyRunning ? 'Stop' : 'Start'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.halfBtn, styles.halfBtnSecondary]}
                onPress={resetWeeklyStopwatch}
              >
                <Text style={styles.halfBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.halfProgressBar}>
              <View style={[styles.progressFill, { width: `${weeklyProgress}%` }]} />
            </View>
            {weeklyGoalMet && <Text style={styles.halfGoalBadge}>✨ Goal Met!</Text>}
            <Text style={styles.halfHint}>
              120 min of art a week improves mental health
            </Text>
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

        <Text style={styles.toolsHintText}>
          The most important thing is that you create — even 5 minutes counts! Share your Courage for tomorrow's Inspiration Ranking (once per day), or save it privately to your Vault. Capture lets you photograph your work or upload a file from your library.
        </Text>

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
            <Text style={styles.writeModalTitle}>Today's suggested prompt:</Text>
            <Text style={styles.writeModalPrompt}>{todaysChallenge}</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Title your work (optional)"
              placeholderTextColor="#888"
              value={writeTitle}
              onChangeText={setWriteTitle}
              maxLength={100}
            />

            {/* Formatting toolbar */}
            <View style={styles.formatToolbar}>
              {/* Font family row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formatScrollRow}>
                {FONT_FAMILIES.map((f) => (
                  <TouchableOpacity
                    key={f.label}
                    style={[styles.formatBtn, textStyle.fontFamily === f.value && styles.formatBtnActive]}
                    onPress={() => setTextStyle(s => ({ ...s, fontFamily: f.value }))}
                  >
                    <Text style={[
                      styles.formatBtnText,
                      textStyle.fontFamily === f.value && styles.formatBtnTextActive,
                      f.value && { fontFamily: f.value },
                    ]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Size + style toggles + alignment */}
              <View style={styles.formatRowWrap}>
                {FONT_SIZES.map((s) => (
                  <TouchableOpacity
                    key={s.label}
                    style={[styles.formatBtn, textStyle.fontSize === s.value && styles.formatBtnActive]}
                    onPress={() => setTextStyle(st => ({ ...st, fontSize: s.value }))}
                  >
                    <Text style={[styles.formatBtnText, textStyle.fontSize === s.value && styles.formatBtnTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}

                <View style={styles.formatDivider} />

                <TouchableOpacity
                  style={[styles.formatBtn, textStyle.fontWeight === 'bold' && styles.formatBtnActive]}
                  onPress={() => setTextStyle(s => ({ ...s, fontWeight: s.fontWeight === 'bold' ? 'normal' : 'bold' }))}
                >
                  <Text style={[styles.formatBtnText, { fontWeight: 'bold' }, textStyle.fontWeight === 'bold' && styles.formatBtnTextActive]}>B</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatBtn, textStyle.fontStyle === 'italic' && styles.formatBtnActive]}
                  onPress={() => setTextStyle(s => ({ ...s, fontStyle: s.fontStyle === 'italic' ? 'normal' : 'italic' }))}
                >
                  <Text style={[styles.formatBtnText, { fontStyle: 'italic' }, textStyle.fontStyle === 'italic' && styles.formatBtnTextActive]}>I</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatBtn, textStyle.textDecorationLine === 'underline' && styles.formatBtnActive]}
                  onPress={() => setTextStyle(s => ({ ...s, textDecorationLine: s.textDecorationLine === 'underline' ? 'none' : 'underline' }))}
                >
                  <Text style={[styles.formatBtnText, { textDecorationLine: 'underline' }, textStyle.textDecorationLine === 'underline' && styles.formatBtnTextActive]}>U</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatBtn, textStyle.textDecorationLine === 'line-through' && styles.formatBtnActive]}
                  onPress={() => setTextStyle(s => ({ ...s, textDecorationLine: s.textDecorationLine === 'line-through' ? 'none' : 'line-through' }))}
                >
                  <Text style={[styles.formatBtnText, { textDecorationLine: 'line-through' }, textStyle.textDecorationLine === 'line-through' && styles.formatBtnTextActive]}>S</Text>
                </TouchableOpacity>

                <View style={styles.formatDivider} />

                {['left', 'center', 'right'].map((align) => (
                  <TouchableOpacity
                    key={align}
                    style={[styles.formatBtn, textStyle.textAlign === align && styles.formatBtnActive]}
                    onPress={() => setTextStyle(s => ({ ...s, textAlign: align }))}
                  >
                    <Text style={[styles.formatBtnText, textStyle.textAlign === align && styles.formatBtnTextActive]}>
                      {align === 'left' ? '⫷' : align === 'center' ? '⫿' : '⫸'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color row */}
              <View style={styles.formatColorRow}>
                {TEXT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.formatColorSwatch,
                      { backgroundColor: c },
                      textStyle.color === c && styles.formatColorActive,
                      c === '#FFFFFF' && { borderColor: '#999', borderWidth: 1 },
                    ]}
                    onPress={() => setTextStyle(s => ({ ...s, color: c }))}
                  />
                ))}
              </View>
            </View>

            <TextInput
              style={[
                styles.writeTextInput,
                {
                  fontFamily: textStyle.fontFamily,
                  fontSize: textStyle.fontSize,
                  color: textStyle.color,
                  fontWeight: textStyle.fontWeight,
                  fontStyle: textStyle.fontStyle,
                  textDecorationLine: textStyle.textDecorationLine,
                  textAlign: textStyle.textAlign,
                },
              ]}
              multiline
              placeholder={modePlaceholders[writeMode] || 'Start writing...'}
              placeholderTextColor="#666"
              value={writeText}
              onChangeText={setWriteText}
              maxLength={2500}
              scrollEnabled
              autoFocus
            />
            <View style={styles.writeButtonRow}>
              <TouchableOpacity style={styles.writePersonalBtn} onPress={saveWriteToPersonal}>
                <Text style={styles.writeBtnText}>Save to{'\n'}Personal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.writeCourageBtn, courageUploadedToday && { opacity: 0.4 }]}
                onPress={saveWriteToCourage}
                disabled={courageUploadedToday}
              >
                <Text style={styles.writeBtnText}>
                  {courageUploadedToday ? 'Courage achieved.\nCome back tomorrow.' : 'Save to\nCourage'}
                </Text>
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
                  {courageUploadedToday ? 'Courage achieved.\nCome back tomorrow.' : 'Share as\nCourage'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.writeCloseBtn} onPress={() => setCaptureModalVisible(false)}>
              <Text style={styles.writeCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Courage Confirmation Modal */}
      <Modal visible={courageConfirmVisible} transparent animationType="fade">
        <View style={styles.courageConfirmOverlay}>
          <View style={styles.courageConfirmCard}>
            <Text style={styles.courageConfirmTitle}>Upload with COURAGE</Text>

            <View style={styles.courageToggleRow}>
              <Text style={styles.courageToggleLabel}>Stay Anonymous</Text>
              <Switch
                value={courageOverrideAnonymous}
                onValueChange={setCourageOverrideAnonymous}
                trackColor={{ false: '#555', true: '#FFD700' }}
                thumbColor={courageOverrideAnonymous ? '#fff' : '#ccc'}
              />
            </View>

            <Text style={styles.courageConfirmMessage}>
              {courageOverrideAnonymous
                ? 'Your Courage has been registered for Ranking tomorrow. It will remain anonymous even after ranking is complete.'
                : 'Your Courage has been registered for Ranking tomorrow. When ranking is over, your Courage will also show your pseudonym in Winner Circle, and galleries.'}
            </Text>

            <View style={styles.courageConfirmButtons}>
              <TouchableOpacity style={styles.courageCancelBtn} onPress={handleCourageCancel}>
                <Text style={styles.courageCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.courageConfirmBtn} onPress={handleCourageConfirm}>
                <Text style={styles.courageConfirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Timer Done Modal (non-blocking so alarm can play) */}
      <Modal visible={timerDoneModalVisible} transparent animationType="fade">
        <View style={styles.timerDoneOverlay}>
          <View style={styles.timerDoneCard}>
            <Text style={styles.timerDoneTitle}>Time's Up!</Text>
            <Text style={styles.timerDoneMessage}>
              {timerSetting} minutes of art time complete!
            </Text>
            <View style={styles.timerDoneButtons}>
              <TouchableOpacity
                style={styles.timerDoneResetBtn}
                onPress={handleTimerRestart}
              >
                <Text style={styles.timerDoneResetText}>Reset Timer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerDoneCloseBtn}
                onPress={handleTimerClose}
              >
                <Text style={styles.timerDoneCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
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
    color: '#9E4502',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  challengeCard: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#f2990a',
    borderRadius: 12,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  challengeLabel: {
    fontSize: 20,
    color: '#9E4502',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  challengeText: {
    fontSize: 32,
    color: '#9E4502',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timerCard: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#f2990a',
    borderRadius: 12,
    padding: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  weeklyCard: {
    backgroundColor: 'transparent',
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
  // Side-by-side timer/stopwatch
  timerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  timerCardHalf: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#f2990a',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  halfLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#332100',
    marginBottom: 6,
  },
  halfInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  halfInput: {
    fontSize: 20,
    color: '#332100',
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#332100',
    width: 34,
    paddingVertical: 2,
  },
  halfColon: {
    fontSize: 20,
    color: '#332100',
    fontWeight: 'bold',
    marginHorizontal: 1,
  },
  halfDisplay: {
    fontSize: 22,
    color: '#332100',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  halfSublabel: {
    fontSize: 11,
    color: '#5a3800',
    marginBottom: 8,
  },
  halfButtons: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  halfBtn: {
    backgroundColor: '#f2990a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  halfBtnStop: {
    backgroundColor: '#FF6B6B',
  },
  halfBtnSecondary: {
    backgroundColor: '#666',
  },
  halfBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  halfHint: {
    fontSize: 11,
    color: '#5a3800',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  halfProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  halfGoalBadge: {
    fontSize: 12,
    color: '#332100',
    fontWeight: 'bold',
    marginBottom: 4,
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
    marginBottom: 16,
  },
  toolButton: {
    alignItems: 'center',
  },
  toolIconContainer: {
    width: 80,
    height: 80,
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
  toolsHintText: {
    fontSize: 13,
    color: '#6B4200',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: -10,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  writeModalOverlay: {
    flex: 1,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    padding: 20,
  },
  writeModalCard: {
    backgroundColor: '#FFF8E7',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#332100',
    textAlign: 'center',
    marginBottom: 6,
  },
  writeModalPrompt: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#332100',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#f7bc6e',
    borderRadius: 10,
    color: '#332100',
    fontSize: 15,
    padding: 10,
    marginBottom: 10,
  },
  writeTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#f7bc6e',
    borderRadius: 10,
    color: '#332100',
    fontSize: 16,
    padding: 15,
    minHeight: 150,
    maxHeight: 300,
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
  courageConfirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  courageConfirmCard: {
    backgroundColor: '#0a0e27',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  courageConfirmTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
  },
  courageToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  courageToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  courageConfirmMessage: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  courageConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  courageCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  courageCancelBtnText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  courageConfirmBtn: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  courageConfirmBtnText: {
    color: '#0a0e27',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formatToolbar: {
    marginBottom: 8,
    gap: 6,
  },
  formatScrollRow: {
    flexGrow: 0,
    marginBottom: 2,
  },
  formatRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  formatBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c8875a',
    backgroundColor: 'rgba(243, 203, 130, 0.3)',
    marginRight: 4,
  },
  formatBtnActive: {
    borderColor: '#f2990a',
    backgroundColor: 'rgba(242, 153, 10, 0.35)',
  },
  formatBtnText: {
    fontSize: 13,
    color: '#5a3800',
  },
  formatBtnTextActive: {
    color: '#332100',
    fontWeight: '700',
  },
  formatDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#c8875a',
    marginHorizontal: 4,
  },
  formatColorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  formatColorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  formatColorActive: {
    borderColor: '#f2990a',
    borderWidth: 2.5,
  },
  timerDoneOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timerDoneCard: {
    backgroundColor: 'rgba(243, 203, 130, 0.95)',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  timerDoneTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#332100',
    marginBottom: 8,
  },
  timerDoneMessage: {
    fontSize: 16,
    color: '#5a3800',
    textAlign: 'center',
    marginBottom: 24,
  },
  timerDoneButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  timerDoneResetBtn: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  timerDoneResetText: {
    color: '#332100',
    fontWeight: 'bold',
    fontSize: 15,
  },
  timerDoneCloseBtn: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
  },
  timerDoneCloseText: {
    color: '#332100',
    fontWeight: '600',
    fontSize: 15,
  },
});

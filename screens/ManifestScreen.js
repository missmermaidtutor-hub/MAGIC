import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  AppState,
  ImageBackground
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getESTDate, msUntilESTMidnight } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { saveManifest, likeQuote, unlikeQuote } from '../services/firestoreService';
import { canAccessFeature } from '../utils/premiumUtils';
import { showAlert } from '../utils/alertUtils';
import PremiumPaywall from '../components/premium/PremiumPaywall';
import quotesData from '../quotes.json';
import { getTodayQuote } from '../utils/quoteUtils';
import { trackAction } from '../services/analyticsService';
import ThemedBackground from '../components/ThemedBackground';

export default function ManifestScreen() {
  const { user, userProfile } = useAuth();
  const [todayQuote, setTodayQuote] = useState({ quote: '', author: '' });
  const [callMuse, setCallMuse] = useState('');
  const [dumpStalls, setDumpStalls] = useState('');
  const [manifestVision, setManifestVision] = useState('');
  const [showPastEntries, setShowPastEntries] = useState(false);
  const [showFavoriteQuotes, setShowFavoriteQuotes] = useState(false);
  const [pastEntries, setPastEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [heartedQuotes, setHeartedQuotes] = useState([]);
  const [todayQuoteHearted, setTodayQuoteHearted] = useState(false);
  const [midnightWarning, setMidnightWarning] = useState(false);
  const [saveNotification, setSaveNotification] = useState(false);

  // Track which text boxes are focused (user is active)
  const [activeFields, setActiveFields] = useState(new Set());
  const midnightTimerRef = useRef(null);
  const graceTimerRef = useRef(null);
  const entryDateRef = useRef(null); // tracks which date the current text belongs to
  // Refs to access latest state values inside timers
  const callMuseRef = useRef('');
  const dumpStallsRef = useRef('');
  const manifestVisionRef = useRef('');
  const activeFieldsRef = useRef(new Set());

  // Keep refs in sync with state
  useEffect(() => { callMuseRef.current = callMuse; }, [callMuse]);
  useEffect(() => { dumpStallsRef.current = dumpStalls; }, [dumpStalls]);
  useEffect(() => { manifestVisionRef.current = manifestVision; }, [manifestVision]);
  useEffect(() => { activeFieldsRef.current = activeFields; }, [activeFields]);

  const handleFieldFocus = (field) => {
    setActiveFields(prev => new Set(prev).add(field));
  };

  const handleFieldBlur = (field) => {
    setActiveFields(prev => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  // Get today's date as a string in EST
  const getTodayDate = () => {
    return getESTDate();
  };

  // Schedule a timer to fire at midnight EST
  const scheduleMidnightReset = () => {
    if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);

    midnightTimerRef.current = setTimeout(() => {
      handleMidnightReset();
    }, msUntilESTMidnight());
  };

  // Called exactly at midnight
  const handleMidnightReset = async () => {
    const isActive = activeFieldsRef.current.size > 0;
    const oldDate = entryDateRef.current;

    if (isActive) {
      // User is actively typing — show warning and start 30-min grace
      setMidnightWarning(true);
      graceTimerRef.current = setTimeout(async () => {
        await autoSaveWithNotation(oldDate);
        resetTextBoxes();
        setMidnightWarning(false);
        entryDateRef.current = getTodayDate();
        scheduleMidnightReset();
      }, 30 * 60 * 1000); // 30 minutes
    } else {
      // Not active — save and reset immediately
      await saveCurrentEntry(oldDate);
      resetTextBoxes();
      entryDateRef.current = getTodayDate();
      scheduleMidnightReset();
    }
  };

  // Auto-save with notation that session extended past midnight
  const autoSaveWithNotation = async (dateKey) => {
    try {
      const date = dateKey || getTodayDate();
      const existing = await AsyncStorage.getItem(`manifest_${date}`);
      const parsed = existing ? JSON.parse(existing) : {};
      const entry = {
        ...parsed,
        callMuse: callMuseRef.current,
        dumpStalls: dumpStallsRef.current,
        manifestVision: manifestVisionRef.current,
        savedAt: new Date().toISOString(),
        autoSaved: true,
        autoSaveNote: 'Session auto-saved after midnight grace period. May be continued on next day.',
      };
      await AsyncStorage.setItem(`manifest_${date}`, JSON.stringify(entry));
      if (user) {
        saveManifest(user.uid, date, entry).catch(err =>
          console.log('Firestore auto-save sync error:', err)
        );
      }
    } catch (error) {
      console.log('Error auto-saving entry:', error);
    }
  };

  // Save current entry for a specific date
  const saveCurrentEntry = async (dateKey) => {
    try {
      const date = dateKey || getTodayDate();
      const existing = await AsyncStorage.getItem(`manifest_${date}`);
      const parsed = existing ? JSON.parse(existing) : {};
      const entry = {
        ...parsed,
        callMuse: callMuseRef.current,
        dumpStalls: dumpStallsRef.current,
        manifestVision: manifestVisionRef.current,
        savedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(`manifest_${date}`, JSON.stringify(entry));
      if (user) {
        saveManifest(user.uid, date, entry).catch(err =>
          console.log('Firestore entry sync error:', err)
        );
      }
    } catch (error) {
      console.log('Error saving entry:', error);
    }
  };

  // Reset muse, dump, vision (NOT the goal)
  const resetTextBoxes = () => {
    setCallMuse('');
    setDumpStalls('');
    setManifestVision('');
  };

  // Get quote of the day (same quote for the whole day)
  useEffect(() => {
    // Load today's quote (shared with HomeScreen via AsyncStorage cache)
    getTodayQuote(quotesData).then(setTodayQuote);

    entryDateRef.current = getTodayDate();
    // Load today's text entry (muse, dump, vision)
    loadTodayEntry();
    // Load past entries for viewing
    loadPastEntries();
    // Load hearted quotes
    loadHeartedQuotes();
    // Schedule midnight reset
    scheduleMidnightReset();

    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    };
  }, []);

  // Reload hearted state and check date every time this screen gets focus
  useFocusEffect(
    useCallback(() => {
      loadHeartedQuotes();
      // Check if date changed while screen was unfocused
      const currentDate = getTodayDate();
      if (entryDateRef.current && entryDateRef.current !== currentDate) {
        // Date changed — reset text boxes for new day
        resetTextBoxes();
        entryDateRef.current = currentDate;
        loadTodayEntry();
        scheduleMidnightReset();
      }
    }, [])
  );

  // Load today's text entry (muse, dump, vision — NOT goal)
  const loadTodayEntry = async () => {
    try {
      const today = getTodayDate();
      const entry = await AsyncStorage.getItem(`manifest_${today}`);
      if (entry) {
        const parsed = JSON.parse(entry);
        setCallMuse(parsed.callMuse || '');
        setDumpStalls(parsed.dumpStalls || '');
        setManifestVision(parsed.manifestVision || '');
      }
    } catch (error) {
      console.log('Error loading entry:', error);
    }
  };

  // Load past entries
  const loadPastEntries = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const manifestKeys = keys.filter(key => key.startsWith('manifest_'));
      const entries = await AsyncStorage.multiGet(manifestKeys);
      
      const parsed = entries
        .map(([key, value]) => ({
          date: key.replace('manifest_', ''),
          ...JSON.parse(value)
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first
      
      setPastEntries(parsed);
    } catch (error) {
      console.log('Error loading past entries:', error);
    }
  };

  // Load hearted quotes
  const loadHeartedQuotes = async () => {
    try {
      const raw = await AsyncStorage.getItem('hearted_quotes');
      if (raw) {
        const parsed = JSON.parse(raw);
        setHeartedQuotes(parsed);
        // Check if today's quote is already hearted
        const todayQ = await getTodayQuote(quotesData);
        const isHearted = parsed.some(q => q.quote === todayQ?.quote);
        setTodayQuoteHearted(isHearted);
      }
    } catch (error) {
      console.log('Error loading hearted quotes:', error);
    }
  };

  // Toggle heart on a quote
  const toggleHeartQuote = async (quoteObj) => {
    try {
      const raw = await AsyncStorage.getItem('hearted_quotes');
      let saved = raw ? JSON.parse(raw) : [];
      const exists = saved.some(q => q.quote === quoteObj.quote);

      if (exists) {
        saved = saved.filter(q => q.quote !== quoteObj.quote);
        trackAction('quote_unhearted');
        // Remove Firestore like
        if (user) {
          unlikeQuote(user.uid, quoteObj.quote).catch(e => console.log('Unlike quote error:', e));
        }
      } else {
        saved.push({ ...quoteObj, heartedAt: new Date().toISOString() });
        trackAction('quote_hearted');
        // Record Firestore like
        if (user) {
          likeQuote(user.uid, quoteObj.quote, quoteObj.author).catch(e => console.log('Like quote error:', e));
        }
      }

      await AsyncStorage.setItem('hearted_quotes', JSON.stringify(saved));
      setHeartedQuotes(saved);

      // Update today's heart state
      if (quoteObj.quote === todayQuote.quote) {
        setTodayQuoteHearted(!exists);
      }
    } catch (error) {
      console.log('Error toggling heart:', error);
    }
  };

  // Save entry
  const saveEntry = async () => {
    try {
      const today = getTodayDate();
      // Preserve any existing fields (e.g. growthGoal set by GoalScreen)
      const existingRaw = await AsyncStorage.getItem(`manifest_${today}`);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const entry = {
        ...existing,
        callMuse,
        dumpStalls,
        manifestVision,
        savedAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(`manifest_${today}`, JSON.stringify(entry));

      // Sync to Firestore
      if (user) {
        saveManifest(user.uid, today, entry).catch(err =>
          console.log('Firestore manifest sync error:', err)
        );
      }

      trackAction('manifest_saved');
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 3000);
      loadPastEntries(); // Refresh past entries
    } catch (error) {
      setSaveNotification(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Filter entries by search
  const filteredEntries = pastEntries.filter(entry => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      entry.growthGoal?.toLowerCase().includes(search) ||
      entry.callMuse?.toLowerCase().includes(search) ||
      entry.dumpStalls?.toLowerCase().includes(search) ||
      entry.manifestVision?.toLowerCase().includes(search) ||
      entry.date.includes(search)
    );
  });

  // ===== FAVORITE QUOTES VIEW =====
  if (showFavoriteQuotes) {
    return (
      <ThemedBackground style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.header}>Favorite Quotes</Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowFavoriteQuotes(false)}
          >
            <Text style={styles.backButtonText}>← Back to Today</Text>
          </TouchableOpacity>

          {heartedQuotes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No favorite quotes yet. Tap the heart on a daily quote to save it!
              </Text>
            </View>
          ) : (
            heartedQuotes.map((q, index) => (
              <View key={index} style={styles.favoriteQuoteCard}>
                <Text style={styles.quoteText}>"{q.quote}"</Text>
                <Text style={styles.quoteAuthor}>~{q.author}</Text>
                <TouchableOpacity
                  style={styles.heartButton}
                  onPress={() => toggleHeartQuote(q)}
                >
                  <Text style={styles.heartIconFilled}>♥</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </ThemedBackground>
    );
  }

  if (showPastEntries) {
    return (
      <ThemedBackground style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.header}>Past Entries</Text>
          
          {/* Search Box */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search entries..."
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowPastEntries(false)}
          >
            <Text style={styles.backButtonText}>← Back to Today</Text>
          </TouchableOpacity>

          {/* Entries List */}
          {filteredEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No entries found' : 'No past entries yet'}
              </Text>
            </View>
          ) : (
            filteredEntries.map((entry, index) => (
              <View key={index} style={styles.entryCard}>
                <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>

                {entry.autoSaved && (
                  <Text style={styles.autoSaveNote}>{entry.autoSaveNote}</Text>
                )}

                {entry.growthGoal && (
                  <View style={styles.entrySection}>
                    <Text style={styles.entrySectionTitle}>Growth Goal:</Text>
                    <Text style={styles.entrySectionText}>{entry.growthGoal}</Text>
                  </View>
                )}
                
                {entry.callMuse && (
                  <View style={styles.entrySection}>
                    <Text style={styles.entrySectionTitle}>Call the Muse:</Text>
                    <Text style={styles.entrySectionText}>{entry.callMuse}</Text>
                  </View>
                )}
                
                {entry.dumpStalls && (
                  <View style={styles.entrySection}>
                    <Text style={styles.entrySectionTitle}>Dump What Stalls:</Text>
                    <Text style={styles.entrySectionText}>{entry.dumpStalls}</Text>
                  </View>
                )}
                
                {entry.manifestVision && (
                  <View style={styles.entrySection}>
                    <Text style={styles.entrySectionTitle}>Manifest Vision:</Text>
                    <Text style={styles.entrySectionText}>{entry.manifestVision}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ marginTop: 40 }} />
        <Text style={styles.subtitle}>Today</Text>
        
        {/* Quote of the Day */}
        <View style={styles.quoteCard}>
          <View style={styles.goldInnerBorder}>
            <Text style={styles.quoteText}>"{todayQuote.quote}"</Text>
            <Text style={styles.quoteAuthor}>~{todayQuote.author}</Text>
            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => toggleHeartQuote(todayQuote)}
            >
              <Text style={todayQuoteHearted ? styles.heartIconFilled : styles.heartIcon}>
                {todayQuoteHearted ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {canAccessFeature('favoriteQuotes', userProfile) ? (
          <TouchableOpacity
            style={styles.viewPastButton}
            onPress={() => setShowFavoriteQuotes(true)}
          >
            <Text style={styles.viewPastButtonText}>
              💜 Review favorite quotes ({heartedQuotes.length})
            </Text>
          </TouchableOpacity>
        ) : (
          <PremiumPaywall feature="favoriteQuotes" compact />
        )}

        {/* Midnight warning banner */}
        {midnightWarning && (
          <View style={styles.midnightBanner}>
            <Text style={styles.midnightBannerText}>
              It is midnight. You've done what you can today. Get ready for tomorrow. This window will save and reset in 30 minutes. If you are still working you can continue in tomorrow's log.
            </Text>
          </View>
        )}

        {/* Journaling Prompts */}
        <View style={styles.journalCard}>
          <View style={styles.goldInnerBorder}>
          <Text style={styles.journalTitle}>Manifest</Text>
          <Text style={styles.privacyNote}>
            This page is your private diary. It will not be shared with any other users, companies, organizations, persons, non-persons, etc. It is stored in archives for the purpose of your own reflection.
          </Text>

          {/* 1. Call the Muse - Long */}
          <View style={styles.promptContainer}>
            <Text style={styles.promptNumber}>1.</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptLabel}>Call the Muse:</Text>
              <TextInput
                style={styles.longInput}
                placeholder="What inspires you? What sparks your creativity?"
                placeholderTextColor="#aaa"
                value={callMuse}
                onChangeText={setCallMuse}
                onFocus={() => handleFieldFocus('muse')}
                onBlur={() => handleFieldBlur('muse')}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* 2. Dump What Stalls - Long */}
          <View style={styles.promptContainer}>
            <Text style={styles.promptNumber}>2.</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptLabel}>Dump what stalls you:</Text>
              <TextInput
                style={styles.longInput}
                placeholder="What's holding you back? Release it here..."
                placeholderTextColor="#aaa"
                value={dumpStalls}
                onChangeText={setDumpStalls}
                onFocus={() => handleFieldFocus('dump')}
                onBlur={() => handleFieldBlur('dump')}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* 3. Manifest Vision - Long */}
          <View style={styles.promptContainer}>
            <Text style={styles.promptNumber}>3.</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptLabel}>Manifest Vision:</Text>
              <TextInput
                style={styles.longInput}
                placeholder="Describe your vision in vivid detail..."
                placeholderTextColor="#aaa"
                value={manifestVision}
                onChangeText={setManifestVision}
                onFocus={() => handleFieldFocus('vision')}
                onBlur={() => handleFieldBlur('vision')}
                multiline
                numberOfLines={6}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={saveEntry}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>

          {/* Save confirmation toast */}
          {saveNotification && (
            <View style={styles.saveToast}>
              <Text style={styles.saveToastText}>Entry saved!</Text>
            </View>
          )}
          </View>
        </View>

        {/* View Past Entries Button (premium) */}
        {canAccessFeature('pastDiaryEntries', userProfile) ? (
          <TouchableOpacity
            style={styles.viewEntriesButton}
            onPress={() => setShowPastEntries(true)}
          >
            <Text style={styles.viewEntriesButtonText}>
              View Past Entries ({pastEntries.length})
            </Text>
          </TouchableOpacity>
        ) : (
          <PremiumPaywall feature="pastDiaryEntries" compact />
        )}
      </ScrollView>
    </ThemedBackground>
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
    color: '#78000E',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    color: '#78000E',
    textAlign: 'center',
    marginBottom: 20,
  },
  quoteCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#78000E',
    position: 'relative',
  },
  quoteText: {
    fontSize: 16,
    color: '#78000E',
    marginBottom: 10,
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#78000E',
    fontStyle: 'italic',
  },
  heartButton: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  heartIcon: {
    fontSize: 28,
    color: '#9C27B0',
  },
  heartIconFilled: {
    fontSize: 28,
    color: '#E91E63',
  },
  favoriteQuoteCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#78000E',
    position: 'relative',
  },
  viewPastButton: {
    backgroundColor: 'transparent',
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  viewPastButtonText: {
    color: '#78000E',
    fontSize: 16,
    fontWeight: '600',
  },
  journalCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#78000E',
    marginBottom: 20,
  },
  journalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#78000E',
    textAlign: 'center',
    marginBottom: 8,
  },
  privacyNote: {
    fontSize: 11,
    color: '#78000E',
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
    marginBottom: 20,
    lineHeight: 16,
  },
  goldInnerBorder: {
    borderWidth: 1,
    borderColor: '#DAA520',
    borderRadius: 8,
    margin: 3,
    padding: 16,
  },
  promptContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  promptNumber: {
    fontSize: 18,
    color: '#78000E',
    fontWeight: 'bold',
    marginRight: 10,
    marginTop: 5,
  },
  promptContent: {
    flex: 1,
  },
  promptLabel: {
    fontSize: 16,
    color: '#78000E',
    marginBottom: 8,
    fontWeight: '600',
  },
  longInput: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 12,
    color: '#78000E',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#78000E',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#78000E',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewEntriesButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#78000E',
  },
  viewEntriesButtonText: {
    color: '#78000E',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 12,
    color: '#78000E',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#78000E',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#78000E',
  },
  backButtonText: {
    color: '#78000E',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  entryCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#78000E',
  },
  entryDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#78000E',
    marginBottom: 15,
  },
  entrySection: {
    marginBottom: 12,
  },
  entrySectionTitle: {
    fontSize: 14,
    color: '#78000E',
    fontWeight: '600',
    marginBottom: 4,
  },
  entrySectionText: {
    fontSize: 15,
    color: '#78000E',
    lineHeight: 22,
  },

  autoSaveNote: {
    fontSize: 12,
    color: '#FFA500',
    fontStyle: 'italic',
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // Midnight warning banner
  midnightBanner: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#78000E',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  midnightBannerText: {
    color: '#78000E',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  saveToast: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#78000E',
  },
  saveToastText: {
    color: '#78000E',
    fontSize: 16,
    fontWeight: '600',
  },
});

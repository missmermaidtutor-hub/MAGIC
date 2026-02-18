import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import quotesData from '../quotes.json';

export default function ManifestScreen() {
  const [todayQuote, setTodayQuote] = useState({ quote: '', author: '' });
  const [growthGoal, setGrowthGoal] = useState('');
  const [callMuse, setCallMuse] = useState('');
  const [dumpStalls, setDumpStalls] = useState('');
  const [manifestVision, setManifestVision] = useState('');
  const [showPastEntries, setShowPastEntries] = useState(false);
  const [showFavoriteQuotes, setShowFavoriteQuotes] = useState(false);
  const [pastEntries, setPastEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [heartedQuotes, setHeartedQuotes] = useState([]);
  const [todayQuoteHearted, setTodayQuoteHearted] = useState(false);

  // Get today's date as a string
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  };

  // Get quote of the day (same quote for the whole day)
  useEffect(() => {
    const today = getTodayDate();
    // Use date as seed for consistent daily quote
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const quoteIndex = dayOfYear % quotesData.length;
    setTodayQuote(quotesData[quoteIndex]);
    
    // Load today's entry if it exists
    loadTodayEntry();
    // Load past entries for viewing
    loadPastEntries();
    // Load hearted quotes
    loadHeartedQuotes();
  }, []);

  // Reload hearted state every time this screen gets focus (syncs with Home)
  useFocusEffect(
    useCallback(() => {
      loadHeartedQuotes();
    }, [])
  );

  // Load today's entry
  const loadTodayEntry = async () => {
    try {
      const today = getTodayDate();
      const entry = await AsyncStorage.getItem(`manifest_${today}`);
      if (entry) {
        const parsed = JSON.parse(entry);
        setGrowthGoal(parsed.growthGoal || '');
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
        const isHearted = parsed.some(q => q.quote === quotesData[Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24) % quotesData.length]?.quote);
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
      } else {
        saved.push({ ...quoteObj, heartedAt: new Date().toISOString() });
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
      const entry = {
        growthGoal,
        callMuse,
        dumpStalls,
        manifestVision,
        savedAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(`manifest_${today}`, JSON.stringify(entry));
      Alert.alert('Saved!', 'Your manifest entry has been saved.');
      loadPastEntries(); // Refresh past entries
    } catch (error) {
      Alert.alert('Error', 'Could not save entry. Please try again.');
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
      <View style={styles.container}>
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
      </View>
    );
  }

  if (showPastEntries) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.header}>Past Entries</Text>
          
          {/* Search Box */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search entries..."
              placeholderTextColor="#666"
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Manifest</Text>
        <Text style={styles.subtitle}>Today</Text>
        
        {/* Quote of the Day */}
        <View style={styles.quoteCard}>
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

        <TouchableOpacity
          style={styles.viewPastButton}
          onPress={() => setShowFavoriteQuotes(true)}
        >
          <Text style={styles.viewPastButtonText}>
            💜 Review favorite quotes ({heartedQuotes.length})
          </Text>
        </TouchableOpacity>

        {/* Journaling Prompts */}
        <View style={styles.journalCard}>
          <Text style={styles.journalTitle}>Manifest</Text>
          
          {/* 1. Growth Goal - Short */}
          <View style={styles.promptContainer}>
            <Text style={styles.promptNumber}>1.</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptLabel}>Today's Growth Goal:</Text>
              <TextInput
                style={styles.shortInput}
                placeholder="What will you achieve today?"
                placeholderTextColor="#666"
                value={growthGoal}
                onChangeText={setGrowthGoal}
              />
            </View>
          </View>

          {/* 2. Call the Muse - Long */}
          <View style={styles.promptContainer}>
            <Text style={styles.promptNumber}>2.</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptLabel}>Call the Muse:</Text>
              <TextInput
                style={styles.longInput}
                placeholder="What inspires you? What sparks your creativity?"
                placeholderTextColor="#666"
                value={callMuse}
                onChangeText={setCallMuse}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* 3. Dump What Stalls - Long */}
          <View style={styles.promptContainer}>
            <Text style={styles.promptNumber}>3.</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptLabel}>Dump what stalls you:</Text>
              <TextInput
                style={styles.longInput}
                placeholder="What's holding you back? Release it here..."
                placeholderTextColor="#666"
                value={dumpStalls}
                onChangeText={setDumpStalls}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* 4. Manifest Vision - Long */}
          <View style={styles.promptContainer}>
            <Text style={styles.promptNumber}>4.</Text>
            <View style={styles.promptContent}>
              <Text style={styles.promptLabel}>Manifest Vision:</Text>
              <TextInput
                style={styles.longInput}
                placeholder="Describe your vision in vivid detail..."
                placeholderTextColor="#666"
                value={manifestVision}
                onChangeText={setManifestVision}
                multiline
                numberOfLines={6}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={saveEntry}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>
        </View>

        {/* View Past Entries Button */}
        <TouchableOpacity 
          style={styles.viewEntriesButton}
          onPress={() => setShowPastEntries(true)}
        >
          <Text style={styles.viewEntriesButtonText}>
            View Past Entries ({pastEntries.length})
          </Text>
        </TouchableOpacity>
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    color: '#9C9FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  quoteCard: {
    backgroundColor: '#4A148C',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFD700',
    position: 'relative',
  },
  quoteText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#E1BEE7',
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
    backgroundColor: '#4A148C',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    position: 'relative',
  },
  viewPastButton: {
    backgroundColor: 'transparent',
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  viewPastButtonText: {
    color: '#DDA0DD',
    fontSize: 16,
    fontWeight: '600',
  },
  journalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 3,
    borderColor: '#FFD700',
    marginBottom: 20,
  },
  journalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9C9FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  promptContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  promptNumber: {
    fontSize: 18,
    color: '#9C9FFF',
    fontWeight: 'bold',
    marginRight: 10,
    marginTop: 5,
  },
  promptContent: {
    flex: 1,
  },
  promptLabel: {
    fontSize: 16,
    color: '#9C9FFF',
    marginBottom: 8,
    fontWeight: '600',
  },
  shortInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  longInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewEntriesButton: {
    backgroundColor: '#4A148C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  viewEntriesButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  backButton: {
    backgroundColor: '#4A148C',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  backButtonText: {
    color: '#FFD700',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4A148C',
  },
  entryDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 15,
  },
  entrySection: {
    marginBottom: 12,
  },
  entrySectionTitle: {
    fontSize: 14,
    color: '#9C9FFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  entrySectionText: {
    fontSize: 15,
    color: '#DDA0DD',
    lineHeight: 22,
  },
});

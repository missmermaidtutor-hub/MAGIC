import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QuotesScreen({ navigation }) {
  const [favoriteQuotes, setFavoriteQuotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('favorite_quotes');
      if (saved) {
        setFavoriteQuotes(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Error loading favorites:', error);
    }
  };

  const filteredQuotes = favoriteQuotes.filter(quote =>
    quote.quote.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Quotes</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <Text style={styles.subtitle}>Your Favorite Quotes</Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search quotes..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredQuotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💜</Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'No quotes found' 
                : 'No favorite quotes yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {!searchQuery && 'Heart a quote from the Manifest page to save it here!'}
            </Text>
          </View>
        ) : (
          filteredQuotes.map((item, index) => (
            <View key={index} style={styles.quoteCard}>
              <Text style={styles.quoteText}>"{item.quote}"</Text>
              <Text style={styles.quoteAuthor}>~ {item.author}</Text>
              <View style={styles.heartBadge}>
                <Text style={styles.heartIcon}>💜</Text>
              </View>
            </View>
          ))
        )}
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  backButtonPlaceholder: {
    width: 44,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    flex: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#DDA0DD',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
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
    borderColor: '#9C27B0',
  },
  quoteCard: {
    backgroundColor: '#4A148C',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#9C27B0',
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
  heartBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  heartIcon: {
    fontSize: 24,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    color: '#DDA0DD',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#87CEEB',
    textAlign: 'center',
    lineHeight: 22,
  },
});

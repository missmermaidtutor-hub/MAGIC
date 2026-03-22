import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { canAccessFeature } from '../../utils/premiumUtils';
import PremiumPaywall from '../../components/premium/PremiumPaywall';
import { getQuoteLikeCounts } from '../../services/firestoreService';

const quoteKeyFromText = (text) => text.slice(0, 80).replace(/[^a-zA-Z0-9]/g, '_');

export default function QuotesScreen({ navigation }) {
  const { userProfile } = useAuth();
  const [favoriteQuotes, setFavoriteQuotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [likeCounts, setLikeCounts] = useState({});
  const isPremium = canAccessFeature('favoriteQuotes', userProfile);

  useEffect(() => {
    loadFavorites();
    loadLikeCounts();
  }, []);

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('hearted_quotes');
      if (saved) {
        setFavoriteQuotes(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Error loading favorites:', error);
    }
  };

  const loadLikeCounts = async () => {
    try {
      const counts = await getQuoteLikeCounts();
      setLikeCounts(counts);
    } catch (error) {
      console.log('Error loading quote like counts:', error);
    }
  };

  const filteredQuotes = favoriteQuotes.filter(quote =>
    quote.quote.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
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
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Your Favorite Quotes</Text>

        {/* Premium gate check */}
        {!isPremium ? (
          <View style={styles.premiumGateContainer}>
            <Text style={styles.premiumGateText}>
              Browsing your favorite quote archive is a premium feature.
            </Text>
            <Text style={styles.premiumGateHint}>
              You have {favoriteQuotes.length} saved quote{favoriteQuotes.length !== 1 ? 's' : ''} waiting for you!
            </Text>
            <PremiumPaywall feature="favoriteQuotes" compact />
          </View>
        ) : (
          <>
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
              filteredQuotes.map((item, index) => {
                const key = quoteKeyFromText(item.quote);
                const count = likeCounts[key] || 0;
                return (
                  <View key={index} style={styles.quoteCard}>
                    <Text style={styles.quoteText}>"{item.quote}"</Text>
                    <Text style={styles.quoteAuthor}>~ {item.author}</Text>
                    <View style={styles.cardFooter}>
                      <View style={styles.likeCount}>
                        <Text style={styles.likeCountText}>
                          {count} {count === 1 ? 'like' : 'likes'}
                        </Text>
                      </View>
                      <View style={styles.heartBadge}>
                        <Text style={styles.heartIcon}>💜</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
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
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#8E0DD3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#8E0DD3',
    fontWeight: 'bold',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8E0DD3',
    textAlign: 'center',
    flex: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  premiumGateContainer: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderWidth: 2,
    borderColor: '#9C27B0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  premiumGateText: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  premiumGateHint: {
    fontSize: 14,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  quoteCard: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#9C27B0',
  },
  quoteText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#E0E0E0',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  likeCount: {
    backgroundColor: 'rgba(156, 39, 176, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  likeCountText: {
    fontSize: 12,
    color: '#DDA0DD',
    fontWeight: '600',
  },
  heartBadge: {},
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
    color: '#E0E0E0',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 22,
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    backgroundColor: '#050d61',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#B8860B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerText: {
    fontSize: 24,
    color: '#8E0DD3',
    fontWeight: 'bold',
  },
});

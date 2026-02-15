import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import quotesData from '../quotes.json';

// Star Component
const Star = ({ size = 24, filled = false }) => (
  <Text style={{ fontSize: size, color: filled ? '#4FC3F7' : '#87CEEB' }}>
    {filled ? '★' : '☆'}
  </Text>
);

// Heart Component
const Heart = ({ size = 24, filled = false, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Text style={{ fontSize: size, color: filled ? '#EF5350' : '#EF5350' }}>
      {filled ? '❤️' : '🤍'}
    </Text>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation }) {
  const [goalCompleted, setGoalCompleted] = useState(false);
  const [quoteHearted, setQuoteHearted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [todayQuote, setTodayQuote] = useState({ quote: '', author: '' });

  const todaysChallenge = "Spin Circles";

  // Get today's quote (synced with Manifest screen)
  useEffect(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const quoteIndex = dayOfYear % quotesData.length;
    setTodayQuote(quotesData[quoteIndex]);
  }, []);

  const navItems = [
    { name: 'Menu', color: '#90EE90' },
    { name: 'Manifest', color: '#DDA0DD' },
    { name: 'Art', color: '#FFD700' },
    { name: 'Goal', color: '#FF6B6B' },
    { name: 'Inspire', color: '#87CEEB' },
    { name: 'Community', color: '#DDA0DD' }
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Header with Menu Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Home</Text>
          <View style={styles.menuButtonPlaceholder} />
        </View>

        {/* Star Progress */}
        <View style={styles.starContainer}>
          {[...Array(20)].map((_, i) => (
            <Star
              key={i}
              size={i < 5 ? 10 : i < 10 ? 14 : i < 15 ? 18 : i < 18 ? 24 : 32}
              filled={i < 15 || i === 18}
            />
          ))}
        </View>
        
        <Text style={styles.tagline}>
          Reach for a star everyday, PSEUDONYM
        </Text>

        <View style={styles.divider} />

        {/* Quote Box */}
        <View style={[styles.card, styles.purpleCard]}>
          <Text style={styles.quoteText}>"{todayQuote.quote}"</Text>
          <Text style={styles.authorText}>~{todayQuote.author}</Text>
          <Text style={styles.manifestText}>
            Ready to <Text style={styles.manifestHighlight}>Manifest?</Text> click here.
          </Text>
          <View style={styles.heartLeft}>
            <Heart
              size={32}
              filled={quoteHearted}
              onPress={() => setQuoteHearted(!quoteHearted)}
            />
          </View>
        </View>

        {/* Goal Box */}
        <View style={[styles.card, styles.redCard]}>
          <Text style={styles.goalTitle}>Did you meet yesterday's grow goal?</Text>
          <Text style={styles.goalSubtext}>click heart for yes</Text>
          <Text style={styles.goalSubtext}>
            then replace with today's <Text style={styles.bold}>goal</Text>, no heart
          </Text>
          <View style={styles.heartRight}>
            <Heart
              size={36}
              filled={goalCompleted}
              onPress={() => setGoalCompleted(!goalCompleted)}
            />
          </View>
        </View>

        {/* Art Challenge Box */}
        <View style={[styles.card, styles.artCard]}>
          <Text style={styles.artLabel}>Art:</Text>
          <Text style={styles.artChallenge}>{todaysChallenge}</Text>
        </View>

        <View style={styles.divider} />

        {/* Ranking Section */}
        <Text style={styles.rankTitle}>Rank by: <Text style={styles.underline}>Most Purple</Text></Text>
        
        <View style={styles.galleryButtons}>
          <TouchableOpacity style={styles.galleryButton}>
            <Text style={styles.galleryButtonText}>show winner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryButton}>
            <Text style={styles.galleryButtonText}>show gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Image Display */}
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
          
          <View style={styles.imageFrame}>
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>🎨</Text>
              <Text style={styles.placeholderSubtext}>Artwork {currentImageIndex + 1}</Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => setCurrentImageIndex(currentImageIndex + 1)}>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Inspired Section */}
        <View style={styles.inspiredContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconEmoji}>✉️</Text>
          </TouchableOpacity>
          
          <View style={styles.inspiredBox}>
            <Text style={styles.inspiredText}>Inspired?</Text>
          </View>
          
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconEmoji}>❤️</Text>
          </TouchableOpacity>
        </View>

        {/* Rating Badge */}
        <View style={styles.ratingContainer}>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>1-5</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
  },
  menuButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  menuButtonPlaceholder: {
    width: 44,
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    flex: 1,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  tagline: {
    fontSize: 18,
    color: '#4FC3F7',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  divider: {
    height: 2,
    backgroundColor: '#FFD700',
    marginVertical: 20,
    opacity: 0.5,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFD700',
    position: 'relative',
  },
  purpleCard: {
    backgroundColor: '#4A148C',
  },
  redCard: {
    backgroundColor: '#B71C1C',
  },
  artCard: {
    backgroundColor: '#1a1a1a',
    padding: 30,
  },
  quoteText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  authorText: {
    fontSize: 12,
    color: '#E1BEE7',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  manifestText: {
    fontSize: 16,
    color: '#4FC3F7',
    fontWeight: '600',
  },
  manifestHighlight: {
    color: '#FFD700',
  },
  heartLeft: {
    position: 'absolute',
    bottom: 15,
    left: 15,
  },
  heartRight: {
    position: 'absolute',
    bottom: 15,
    right: 15,
  },
  goalTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
    marginBottom: 10,
  },
  goalSubtext: {
    fontSize: 14,
    color: '#FFCDD2',
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  artLabel: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  artChallenge: {
    fontSize: 32,
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rankTitle: {
    fontSize: 22,
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  galleryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  galleryButton: {
    backgroundColor: '#B8860B',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  galleryButtonText: {
    color: '#FFE082',
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  arrow: {
    fontSize: 48,
    color: '#FFD700',
    paddingHorizontal: 10,
  },
  imageFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    padding: 10,
  },
  placeholderImage: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 60,
    marginBottom: 10,
  },
  placeholderSubtext: {
    color: '#FFD700',
    fontSize: 16,
  },
  inspiredContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 15,
  },
  iconEmoji: {
    fontSize: 32,
  },
  inspiredBox: {
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  inspiredText: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  ratingContainer: {
    alignItems: 'flex-end',
    marginTop: 15,
  },
  ratingBadge: {
    backgroundColor: '#B8860B',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 25,
    paddingVertical: 10,
  },
  ratingText: {
    color: '#FFE082',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

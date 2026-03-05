import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ImageBackground, Linking, Alert } from 'react-native';

export default function AboutUsScreen({ navigation }) {
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
          <Text style={styles.header}>About Us</Text>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>MAGIC Tracker</Text>
          <Text style={styles.subtitle}>Daily Creative Practice for Mental Health</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.text}>
              We exist to help you reclaim your mind from noise, break anxious patterns, and step out of doom spirals — in just 13 nights.
            </Text>
            <Text style={styles.text}>
              Through five simple, guided daily practices, we are committed to strengthening your attention, transforming emotion into expression, and building creative power from the inside out. Not every practice is art — but every practice is designed to expand your creativity.
            </Text>
            <Text style={styles.text}>
              We believe creative breakthrough isn't a talent. It's a trained capacity.
            </Text>
            <Text style={styles.text}>
              Whether you spend five minutes or twenty, whether you complete one practice or all five, we're here to support your momentum, your streak, and your growth.
            </Text>
            <Text style={styles.text}>
              Our commitment is to help you grow clearer, grow braver, and create from a place that's fully yours — with the courage to share your work, even under a pseudonym, when you're ready.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What is MAGIC?</Text>
            <Text style={styles.magicItem}>📝 <Text style={styles.boldM}>M</Text>anifest - Daily journaling and goal setting</Text>
            <Text style={styles.magicItem}>🎨 <Text style={styles.boldA}>A</Text>rt - 20 minutes of creative practice</Text>
            <Text style={styles.magicItem}>🎯 <Text style={styles.boldG}>G</Text>oal - Set and track growth goals</Text>
            <Text style={styles.magicItem}>✨ <Text style={styles.boldI}>I</Text>nspire - Rank and appreciate community art</Text>
            <Text style={styles.magicItem}>💪 <Text style={styles.boldC}>C</Text>ourage - Share your creativity publicly</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Research-Backed</Text>
            <Text style={styles.text}>
              Studies show that 120 minutes of creative activity per week significantly improves mental health outcomes. MAGIC Tracker makes it easy to reach this goal through daily practice.
            </Text>

            <View style={styles.articlesContainer}>
              <TouchableOpacity
                style={styles.articleCard}
                onPress={() => Linking.openURL('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4937104/')}
              >
                <Text style={styles.articleTitle}>120 Minutes of Art Per Week</Text>
                <Text style={styles.articleDescription}>Study shows creative activities improve mental health</Text>
                <Text style={styles.articleLink}>Read More →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.articleCard}
                onPress={() => Linking.openURL('https://www.psychologytoday.com/us/basics/creativity')}
              >
                <Text style={styles.articleTitle}>The Psychology of Creativity</Text>
                <Text style={styles.articleDescription}>How creative expression affects wellbeing</Text>
                <Text style={styles.articleLink}>Read More →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.articleCard}
                onPress={() => Linking.openURL('https://www.arttherapy.org/research/')}
              >
                <Text style={styles.articleTitle}>Art Therapy Research</Text>
                <Text style={styles.articleDescription}>Benefits of regular artistic practice</Text>
                <Text style={styles.articleLink}>Read More →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why Daily Practice?</Text>
            <Text style={styles.text}>
              • Reduces stress and anxiety{'\n'}
              • Improves mood and wellbeing{'\n'}
              • Builds creative confidence{'\n'}
              • Creates supportive community{'\n'}
              • Develops sustainable habits
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Approach</Text>
            <Text style={styles.text}>
              We believe everyone is creative. MAGIC Tracker removes barriers to creative practice by providing structure, prompts, and community support. Whether you're an experienced artist or just beginning, our system adapts to your journey.
            </Text>
          </View>
        </View>
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
  backButtonPlaceholder: {
    width: 44,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8E0DD3',
    textAlign: 'center',
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderWidth: 3,
    borderColor: '#8E0DD3',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8E0DD3',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#061679',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#061679',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#061679',
    lineHeight: 24,
  },
  magicItem: {
    fontSize: 16,
    color: '#061679',
    marginBottom: 8,
    lineHeight: 24,
  },
  boldM: {
    fontWeight: 'bold',
    color: '#DC143C',
  },
  boldA: {
    fontWeight: 'bold',
    color: '#FF7F00',
  },
  boldG: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  boldI: {
    fontWeight: 'bold',
    color: '#22C55E',
  },
  boldC: {
    fontWeight: 'bold',
    color: '#6366F1',
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
  articlesContainer: {
    marginTop: 15,
  },
  articleCard: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8E0DD3',
    marginBottom: 5,
  },
  articleDescription: {
    fontSize: 14,
    color: '#061679',
    marginBottom: 8,
  },
  articleLink: {
    fontSize: 14,
    color: '#061679',
    fontWeight: '600',
  },
});

import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { openMailto } from '../../utils/emailUtils';
import { useTheme } from '../../context/ThemeContext';

export default function AboutUsScreen({ navigation }) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, theme.isDark && { color: '#ffffff' }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.header, { color: theme.text.heading }]}>About Us</Text>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={[styles.hamburgerText, theme.isDark && { color: '#ffffff' }]}>☰</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={[styles.title, theme.isDark && { color: '#ffffff' }]}><Text style={[styles.boldM, { color: theme.magic.m }]}>M</Text><Text style={[styles.boldA, { color: theme.magic.a }]}>A</Text><Text style={[styles.boldG, { color: theme.magic.g }]}>G</Text><Text style={[styles.boldI, { color: theme.magic.i }]}>I</Text><Text style={[styles.boldC, { color: theme.magic.c }]}>C</Text> Tracker</Text>
          <Text style={[styles.subtitle, { color: theme.text.body }]}>Daily Creative Practice for Mental Health</Text>
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.isDark && { color: '#ffffff' }]}>Our Mission</Text>
            <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>
              We exist to help you reclaim your mind from noise, break anxious patterns, and step out of doom spirals — in just 13 nights.
            </Text>
            <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>
              Through five simple, guided daily practices, we are committed to strengthening your attention, transforming emotion into expression, and building creative power from the inside out. Not every practice is art — but every practice is designed to expand your creativity.
            </Text>
            <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>
              We believe creative breakthrough isn't a talent. It's a trained capacity.
            </Text>
            <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>
              Whether you spend five minutes or twenty, whether you complete one practice or all five, we're here to support your momentum, your streak, and your growth.
            </Text>
            <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>
              Our commitment is to help you grow clearer, grow braver, and create from a place that's fully yours — with the courage to share your work, even under a pseudonym, when you're ready.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.isDark && { color: '#ffffff' }]}>What is MAGIC?</Text>
            <Text style={[styles.magicItem, theme.isDark && { color: '#ffffff' }]}>📝 <Text style={[styles.boldM, { color: theme.magic.m }]}>M</Text>anifest - Daily journaling and goal setting</Text>
            <Text style={[styles.magicItem, theme.isDark && { color: '#ffffff' }]}>🎨 <Text style={[styles.boldA, { color: theme.magic.a }]}>A</Text>rt - 20 minutes of creative practice</Text>
            <Text style={[styles.magicItem, theme.isDark && { color: '#ffffff' }]}>🎯 <Text style={[styles.boldG, { color: theme.magic.g }]}>G</Text>oal - Set and track growth goals</Text>
            <Text style={[styles.magicItem, theme.isDark && { color: '#ffffff' }]}>✨ <Text style={[styles.boldI, { color: theme.magic.i }]}>I</Text>nspire - Rank and appreciate community art</Text>
            <Text style={[styles.magicItem, theme.isDark && { color: '#ffffff' }]}>💪 <Text style={[styles.boldC, { color: theme.magic.c }]}>C</Text>ourage - Share your creativity publicly</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.isDark && { color: '#ffffff' }]}>Research-Backed</Text>
            <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>
              Studies show that 120 minutes of creative activity per week significantly improves mental health outcomes. MAGIC Tracker makes it easy to reach this goal through daily practice.
            </Text>

            <View style={styles.articlesContainer}>
              <TouchableOpacity
                style={styles.articleCard}
                onPress={() => Linking.openURL('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4937104/')}
              >
                <Text style={[styles.articleTitle, theme.isDark && { color: '#ffffff' }]}>120 Minutes of Art Per Week</Text>
                <Text style={[styles.articleDescription, theme.isDark && { color: '#ffffff' }]}>Study shows creative activities improve mental health</Text>
                <Text style={[styles.articleLink, theme.isDark && { color: '#ffffff' }]}>Read More →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.articleCard}
                onPress={() => Linking.openURL('https://www.psychologytoday.com/us/basics/creativity')}
              >
                <Text style={[styles.articleTitle, theme.isDark && { color: '#ffffff' }]}>The Psychology of Creativity</Text>
                <Text style={[styles.articleDescription, theme.isDark && { color: '#ffffff' }]}>How creative expression affects wellbeing</Text>
                <Text style={[styles.articleLink, theme.isDark && { color: '#ffffff' }]}>Read More →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.articleCard}
                onPress={() => Linking.openURL('https://www.arttherapy.org/research/')}
              >
                <Text style={[styles.articleTitle, theme.isDark && { color: '#ffffff' }]}>Art Therapy Research</Text>
                <Text style={[styles.articleDescription, theme.isDark && { color: '#ffffff' }]}>Benefits of regular artistic practice</Text>
                <Text style={[styles.articleLink, theme.isDark && { color: '#ffffff' }]}>Read More →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.isDark && { color: '#ffffff' }]}>Why Daily Practice?</Text>
            <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>
              • Reduces stress and anxiety{'\n'}
              • Improves mood and wellbeing{'\n'}
              • Builds creative confidence{'\n'}
              • Creates supportive community{'\n'}
              • Develops sustainable habits
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.isDark && { color: '#ffffff' }]}>Our Approach</Text>
            <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>
              We believe everyone is creative. MAGIC Tracker removes barriers to creative practice by providing structure, prompts, and community support. Whether you're an experienced artist or just beginning, our system adapts to your journey.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.isDark && { color: '#ffffff' }]}>Contact Us</Text>
            <Text style={[styles.text, theme.isDark && { color: '#ffffff' }]}>
              We'd love to hear from you! Have questions, suggestions, or need help? Send us an email and we'll get back to you as soon as possible.
            </Text>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => openMailto('MAGIC Tracker Feedback', '', 'cecelia@13magicalnights.com')}
            >
              <Text style={styles.contactIcon}>📧</Text>
              <Text style={[styles.contactText, theme.isDark && { color: '#ffffff' }]}>cecelia@13magicalnights.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#4B0082',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#4B0082',
    fontWeight: 'bold',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    flex: 1,
  },
  card: {
    borderWidth: 3,
    borderColor: '#4B0082',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4B0082',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B0082',
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
    color: '#4B0082',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#4B0082',
    lineHeight: 24,
  },
  magicItem: {
    fontSize: 16,
    color: '#4B0082',
    marginBottom: 8,
    lineHeight: 24,
  },
  boldM: {
    fontWeight: 'bold',
    color: '#78000E',
  },
  boldA: {
    fontWeight: 'bold',
    color: '#9E4502',
  },
  boldG: {
    fontWeight: 'bold',
    color: '#c1a900',
  },
  boldI: {
    fontWeight: 'bold',
    color: '#3c9820',
  },
  boldC: {
    fontWeight: 'bold',
    color: '#5008a7',
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#4B0082',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerText: {
    fontSize: 24,
    color: '#4B0082',
    fontWeight: 'bold',
  },
  articlesContainer: {
    marginTop: 15,
  },
  articleCard: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#4B0082',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B0082',
    marginBottom: 5,
  },
  articleDescription: {
    fontSize: 14,
    color: '#4B0082',
    marginBottom: 8,
  },
  articleLink: {
    fontSize: 14,
    color: '#4B0082',
    fontWeight: '600',
  },
  contactButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 3,
    borderColor: '#4B0082',
  },
  contactIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  contactText: {
    fontSize: 15,
    color: '#4B0082',
    fontWeight: 'bold',
  },
});

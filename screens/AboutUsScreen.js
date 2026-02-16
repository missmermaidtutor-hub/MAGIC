import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function AboutUsScreen({ navigation }) {
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
          <Text style={styles.header}>About Us</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>MAGIC Tracker</Text>
          <Text style={styles.subtitle}>Daily Creative Practice for Mental Health</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.text}>
              MAGIC Tracker helps you build a sustainable creative practice through daily activities that improve mental health and wellbeing.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What is MAGIC?</Text>
            <Text style={styles.magicItem}>📝 <Text style={styles.bold}>M</Text>anifest - Daily journaling and goal setting</Text>
            <Text style={styles.magicItem}>🎨 <Text style={styles.bold}>A</Text>rt - 20 minutes of creative practice</Text>
            <Text style={styles.magicItem}>🎯 <Text style={styles.bold}>G</Text>oal - Set and track growth goals</Text>
            <Text style={styles.magicItem}>✨ <Text style={styles.bold}>I</Text>nspire - Rank and appreciate community art</Text>
            <Text style={styles.magicItem}>💪 <Text style={styles.bold}>C</Text>ourage - Share your creativity publicly</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Research-Backed</Text>
            <Text style={styles.text}>
              Studies show that 120 minutes of creative activity per week significantly improves mental health outcomes. MAGIC Tracker makes it easy to reach this goal through daily practice.
            </Text>
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
  card: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#DDA0DD',
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
    color: '#87CEEB',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#DDA0DD',
    lineHeight: 24,
  },
  magicItem: {
    fontSize: 16,
    color: '#DDA0DD',
    marginBottom: 8,
    lineHeight: 24,
  },
  bold: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
});

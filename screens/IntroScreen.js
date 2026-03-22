import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openMailto } from '../utils/emailUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dark scheme MAGIC colors
const COLORS = {
  M: '#78000E',
  A: '#9E4502',
  G: '#c1a900',
  I: '#3c9820',
  C: '#5008a7',
  gold: '#FFD700',
  bg: '#FAEBD7',
};

const PAGES = [
  {
    // Page 1: Welcome / Purpose
    accent: COLORS.gold,
    title: 'Welcome to MAGIC',
    body:
      'MAGIC is your daily creative practice — designed to replace mindless scrolling with mindful creating.\n\n' +
      'Each day, complete 5 simple tasks to earn your MAGIC star. Keep your streak alive and watch your creativity grow.\n\n' +
      'Your first 13 Magical Nights are completely free.',
  },
  {
    // Page 2: Manifest
    accent: COLORS.M,
    letter: 'M',
    title: 'Manifest',
    body:
      'Start each day by writing in your journal.\n\n' +
      'Choose a Muse prompt, dump your thoughts, or set your vision. This is your private space to process and create clarity.',
  },
  {
    // Page 3: Art
    accent: COLORS.A,
    letter: 'A',
    title: 'Art',
    body:
      'Create something today.\n\n' +
      'Use the daily prompt, sketch, paint, write, or snap a photo. Set the art timer and let your creativity flow — even 5 minutes counts.',
  },
  {
    // Page 4: Grow
    accent: COLORS.G,
    letter: 'G',
    title: 'Grow',
    body:
      'Set one growth goal each day.\n\n' +
      'Check in on yesterday\'s goal — did you meet it? Carry it forward or set a new one. Small steps build big change.',
  },
  {
    // Page 5: Inspire
    accent: COLORS.I,
    letter: 'I',
    title: 'Inspire',
    body:
      'Vote on today\'s community artwork.\n\n' +
      'Rank submissions, discover new artists, and save pieces that move you. Your vote helps choose the daily winner.',
  },
  {
    // Page 6: Connect + Contact
    accent: COLORS.C,
    letter: 'C',
    title: 'Connect',
    body:
      'Share your creation with the community.\n\n' +
      'Upload your artwork for voting, browse the winner gallery, or send inspiration to a friend. Being brave enough to share earns your final star.',
    isLast: true,
  },
];

export default function IntroScreen({ navigation }) {
  const [page, setPage] = useState(0);
  const current = PAGES[page];

  const handleNext = () => {
    if (page < PAGES.length - 1) {
      setPage(page + 1);
    }
  };

  const handleBack = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('quick_launch_dismissed', 'true');
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {/* Page content */}
        <View style={styles.contentArea}>
          {/* Step indicator */}
          {current.letter ? (
            <View style={[styles.letterCircle, { borderColor: current.accent }]}>
              <Text style={[styles.letterText, { color: current.accent }]}>
                {current.letter}
              </Text>
            </View>
          ) : (
            <View style={[styles.letterCircle, { borderColor: current.accent }]}>
              <Text style={[styles.starEmoji]}>&#x2B50;</Text>
            </View>
          )}

          <Text style={[styles.title, { color: current.accent }]}>
            {current.title}
          </Text>

          {/* Content box */}
          <View style={[styles.contentBox, { borderColor: current.accent }]}>
            <Text style={[styles.bodyText, { color: current.accent }]}>
              {current.body}
            </Text>
          </View>

          {/* Contact info on last page */}
          {current.isLast && (
            <View style={styles.contactSection}>
              <Text style={styles.contactLabel}>Questions? Reach out anytime:</Text>
              <TouchableOpacity
                onPress={() => openMailto(
                  'Question about MAGIC',
                  'Hi!\n\nI have a question about the MAGIC app:\n\n'
                )}
              >
                <Text style={styles.contactEmail}>cecelia@13magicalnights.com</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Page dots */}
        <View style={styles.dotsRow}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === page
                  ? { backgroundColor: current.accent }
                  : { backgroundColor: 'rgba(75, 0, 130, 0.2)' },
              ]}
            />
          ))}
        </View>

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {page > 0 ? (
            <TouchableOpacity style={styles.navButton} onPress={handleBack}>
              <Text style={styles.navButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.navButton} />
          )}

          {current.isLast ? (
            <TouchableOpacity
              style={[styles.getStartedButton, { backgroundColor: current.accent }]}
              onPress={handleGetStarted}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, { borderColor: current.accent }]}
              onPress={handleNext}
            >
              <Text style={[styles.nextButtonText, { color: current.accent }]}>
                Next
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Skip link */}
        {!current.isLast && (
          <TouchableOpacity onPress={handleGetStarted} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip intro</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAEBD7',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Letter circle
  letterCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  letterText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  starEmoji: {
    fontSize: 28,
  },

  // Title
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Content box
  contentBox: {
    borderWidth: 3,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  // Contact section (last page)
  contactSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 13,
    color: '#4B0082',
    marginBottom: 6,
  },
  contactEmail: {
    fontSize: 15,
    color: '#4B0082',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 12,
  },
  navButtonText: {
    fontSize: 15,
    color: '#4B0082',
    fontWeight: '600',
  },
  nextButton: {
    borderWidth: 2,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  getStartedButton: {
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FAEBD7',
  },

  // Skip
  skipButton: {
    alignSelf: 'center',
    marginTop: 16,
  },
  skipText: {
    fontSize: 13,
    color: '#4B0082',
  },
});

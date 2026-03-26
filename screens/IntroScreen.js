import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openMailto } from '../utils/emailUtils';
import Svg, { Path } from 'react-native-svg';

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

const SLIDE_IMAGES = {
  manifest: require('../assets/Slide deck 2.jpg'),
  art: require('../assets/Slide deck 3.jpg'),
  grow: require('../assets/Slide deck 4.jpg'),
  inspire: require('../assets/Slide deck 5.jpg'),
  connect: require('../assets/Slide deck 6.jpg'),
};

const PAGES = [
  {
    // Page 1: Welcome / Purpose
    accent: '#4B0082',
    title: 'Welcome to MAGIC',
    body:
      'MAGIC is your daily creative practice — designed to replace mindless scrolling with mindful creating.\n\n' +
      'Each day, complete 5 simple tasks to earn your MAGIC star. Keep your streak alive and watch your creativity grow.\n\n' +
      'There is no cost to get started. Reach a 13-day streak to unlock a free premium trial!',
    hasStar: true,
  },
  {
    // Page 2: Manifest
    accent: COLORS.M,
    letter: 'M',
    title: 'Manifest',
    body:
      'Start each day with a Creativity quote to light the way. Next create a goal, muse about what inspires you, dump the thoughts that hold you back, or set your vision. This is your private space to process and create clarity for the day.',
    image: 'manifest',
  },
  {
    // Page 3: Art
    accent: COLORS.A,
    letter: 'A',
    title: 'Art',
    body:
      'Create something today.\n\n' +
      'Use the daily prompt (click nudge if you need more context or work on your own art idea), sketch, paint, write, snap a photo. If you are working out of the app set the art timer and let your creativity flow — even 5 minutes counts.\n\n' +
      'Once per day, courageously submit your work for Inspiration! It doesn\'t need to be perfect, or even good — just share that you\'ve spent time with creativity. These will be seen under your pseudonym so don\'t be shy!',
    image: 'art',
  },
  {
    // Page 4: Grow
    accent: COLORS.G,
    letter: 'G',
    title: 'Grow',
    body:
      'Set one growth goal each day.\n\n' +
      'Check in on yesterday\'s goal — did you meet it? Small steps build big change. The Grow page shows your streak or click today to see which tasks still need to be done to earn a gold star!',
    image: 'grow',
  },
  {
    // Page 5: Inspire
    accent: COLORS.I,
    letter: 'I',
    title: 'Inspire',
    body:
      'Vote on today\'s community artwork based on today\'s ranking criteria, not what\'s the "best" — maybe which is the most blue or the messiest, or which shows Conviction.\n\n' +
      'Rank submissions so each image is ranked 1-4. Discover new artists, and light the candle next to the ones that inspire you. Your vote helps choose the daily winner, which is revealed the next day.',
    image: 'inspire',
  },
  {
    // Page 6: Connect + Contact
    accent: COLORS.C,
    letter: 'C',
    title: 'Connect',
    body:
      'You\'ve uploaded Courage for your final star point, now connect to the art. See your Private gallery that holds your art and those you\'ve lit for inspiration as well as the Curated galleries that hold works that other users hold dear.\n\n' +
      'In 10 days, you\'ll be able to start curating your gallery too, but for now get used to these 5 creative steps!\n\n' +
      'You are about to go to the home page which will show you your star streak. Your streak continues with input in any category you see on the home page: Manifest, Art Studio Prompt, Goal setting, Inspiration ranking, and Courage. Click on the star to see how to fill it if you\'ve forgotten.',
    image: 'connect',
    isLast: true,
  },
];

const IntroStar = ({ size = 48 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2;
  const innerR = outerR * 0.38;
  const colors = ['#DC143C', '#FF7F00', '#FFD700', '#22C55E', '#6366F1'];
  // 5-pointed star: each wedge is a triangle from center through one outer point
  // Point angles: -90, -18, 54, 126, 198 (top, then clockwise)
  const pointAngles = [-90, -18, 54, 126, 198];
  // Inner valley angles halfway between points
  const valleyAngles = [-54, 18, 90, 162, 234];

  return (
    <Svg width={size} height={size}>
      {colors.map((color, i) => {
        const pRad = (pointAngles[i] * Math.PI) / 180;
        const v1Rad = (valleyAngles[(i + 4) % 5] * Math.PI) / 180;
        const v2Rad = (valleyAngles[i] * Math.PI) / 180;
        const px = cx + outerR * Math.cos(pRad);
        const py = cy + outerR * Math.sin(pRad);
        const v1x = cx + innerR * Math.cos(v1Rad);
        const v1y = cy + innerR * Math.sin(v1Rad);
        const v2x = cx + innerR * Math.cos(v2Rad);
        const v2y = cy + innerR * Math.sin(v2Rad);
        return (
          <Path
            key={i}
            d={`M ${cx} ${cy} L ${v1x} ${v1y} L ${px} ${py} L ${v2x} ${v2y} Z`}
            fill={color}
          />
        );
      })}
    </Svg>
  );
};

export default function IntroScreen({ navigation, route }) {
  const fromMenu = route.params?.fromMenu || false;
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
    if (fromMenu) {
      navigation.navigate('Menu');
    } else {
      await AsyncStorage.setItem('quick_launch_dismissed', 'true');
      navigation.navigate('Home');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {/* Menu button */}
        {fromMenu && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.menuButtonText}>&#9776;</Text>
          </TouchableOpacity>
        )}

        {/* Page content */}
        <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
          {/* Step indicator */}
          {current.hasStar ? (
            <View style={[styles.letterCircle, { borderColor: current.accent }]}>
              <IntroStar size={48} />
            </View>
          ) : current.letter ? (
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
            <Text style={[styles.bodyText, { color: '#4B0082' }]}>
              {current.body}
            </Text>
          </View>

          {/* Slide image */}
          {current.image && (
            <Image
              source={SLIDE_IMAGES[current.image]}
              style={styles.slideImage}
              resizeMode="contain"
            />
          )}

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
        </ScrollView>

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
  menuButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  menuButtonText: {
    fontSize: 28,
    color: '#4B0082',
  },
  contentArea: {
    flexGrow: 1,
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

  // Slide image
  slideImage: {
    width: '100%',
    maxWidth: 380,
    height: 200,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#4B0082',
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

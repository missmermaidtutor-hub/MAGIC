import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// GoldFrame — gradient metallic gold border with gleam (copied from HomeScreen)
const GoldFrame = ({ children, style, containerStyle, thickness = 4 }) => (
  <View style={[{
    borderRadius: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  }, containerStyle]}>
    <LinearGradient
      colors={['#FFF8DC', '#FFD700', '#B8860B', '#FFD700', '#FFFACD', '#DAA520', '#B8860B', '#FFD700', '#FFF8DC']}
      locations={[0, 0.12, 0.25, 0.4, 0.5, 0.6, 0.75, 0.88, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 6, padding: thickness }}
    >
      <View style={{
        borderRadius: 3,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 248, 220, 0.5)',
      }}>
        <View style={[{ borderRadius: 3, overflow: 'hidden' }, style]}>
          {children}
        </View>
      </View>
    </LinearGradient>
  </View>
);

export default function QuickLaunchScreen({ navigation }) {
  const canGoBack = navigation.canGoBack();

  const handleDismiss = async () => {
    await AsyncStorage.setItem('quick_launch_dismissed', 'true');
    navigation.navigate('Home');
  };

  const handleKeep = () => {
    navigation.navigate('Home');
  };

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header row */}
        <View style={styles.headerContainer}>
          {canGoBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <Text style={styles.header}>Quick Launch Info</Text>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* Gold header text box */}
        <View style={styles.goldHeaderBox}>
          <Text style={styles.goldHeaderText}>
            Every task will fill an arm of your daily streak star. Complete all 5 daily MAGIC tasks to earn a GOLD star. Start your streak with 13 nights then see how long you can keep it going!
          </Text>
        </View>

        {/* Manifest box (Pink) */}
        <View style={styles.manifestBorder}>
          <View style={styles.manifestBox}>
            <View style={styles.boxTitleRow}>
              <Text style={styles.manifestTitle}>M — Manifest</Text>
              <Text style={styles.manifestNumber}>1</Text>
            </View>
            <Text style={styles.manifestText}>
              Start your day by writing in your journal. Use the Muse prompt, dump your thoughts, or set your vision. This is your space to process and create clarity.
            </Text>
          </View>
        </View>

        {/* Art box (Cream) */}
        <View style={styles.artBorder}>
          <View style={styles.artBox}>
            <View style={styles.boxTitleRow}>
              <Text style={styles.artTitle}>A — Art</Text>
              <Text style={styles.artNumber}>2</Text>
            </View>
            <Text style={styles.artText}>
              Create something today! Use the daily challenge prompt, sketch, write, record audio, or capture a photo. Set your art timer and let your creativity flow.
            </Text>
          </View>
        </View>

        {/* Goals box (Yellow) */}
        <View style={styles.goalBorder}>
          <View style={styles.goalBox}>
            <View style={styles.boxTitleRow}>
              <Text style={styles.goalTitle}>G — Goals</Text>
              <Text style={styles.goalNumber}>3</Text>
            </View>
            <Text style={styles.goalText}>
              Set a growth goal each day. Check in on yesterday's goal — did you meet it? Keep pushing forward or carry it over. Small steps build big change.
            </Text>
          </View>
        </View>

        {/* Inspire box (Green) */}
        <View style={styles.inspireBorder}>
          <View style={styles.inspireBox}>
            <View style={styles.boxTitleRow}>
              <Text style={styles.inspireTitle}>I — Inspire</Text>
              <Text style={styles.inspireNumber}>4</Text>
            </View>
            <Text style={styles.inspireText}>
              Vote on today's artwork submissions. Rank them by the daily criterion and help choose the community winner. Your vote matters!
            </Text>
          </View>
        </View>

        {/* Courage box (Gold shimmer) */}
        <View style={styles.courageContainer}>
          <LinearGradient
            colors={['#FFF8DC', '#FFD700', '#B8860B', '#FFD700', '#FFFACD', '#DAA520', '#B8860B', '#FFD700', '#FFF8DC']}
            locations={[0, 0.12, 0.25, 0.4, 0.5, 0.6, 0.75, 0.88, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.courageGradient}
          >
            <View style={styles.boxTitleRow}>
              <Text style={styles.courageTitle}>C — Courage</Text>
              <Text style={styles.courageNumber}>5</Text>
            </View>
            <Text style={styles.courageText}>
              Share your creation with the community! Upload your artwork to the public gallery for voting. Being brave enough to share is what earns your Courage star.
            </Text>
          </LinearGradient>
        </View>

        {/* Connect box (Blue) */}
        <View style={styles.connectBorder}>
          <View style={styles.connectBox}>
            <View style={styles.boxTitleRow}>
              <Text style={styles.connectTitle}>C — Connect</Text>
              <Text style={styles.connectNumber}>5</Text>
            </View>
            <Text style={styles.connectText}>
              Browse the winner gallery, save artwork that inspires you, or send an inspiration email to a friend. Connecting with creativity is an alternate way to earn your final daily star point.
            </Text>
          </View>
        </View>

        {/* Winner showcase (static, non-interactive) */}
        <View style={styles.showcaseSection}>
          <View style={styles.galleryButtonRow}>
            <View style={styles.galleryButtonLeft}>
              <GoldFrame>
                <View style={styles.galleryButtonInner}>
                  <Text style={styles.galleryButtonText}>Show Current{'\n'}Winner</Text>
                </View>
              </GoldFrame>
            </View>
            <View style={styles.galleryButtonRight}>
              <GoldFrame>
                <View style={styles.galleryButtonInner}>
                  <Text style={styles.galleryButtonText}>Show Gallery</Text>
                </View>
              </GoldFrame>
            </View>
          </View>

          <View style={styles.winnerFrameContainer}>
            <GoldFrame thickness={50}>
              <View style={styles.placeholderFrame}>
                <Text style={styles.placeholderText}>Winners will{'\n'}appear here</Text>
              </View>
            </GoldFrame>
          </View>

          <View style={styles.winnerLabelRow}>
            <GoldFrame>
              <View style={styles.winnerLabelInner}>
                <Text style={styles.winnerLabelText}>---</Text>
              </View>
            </GoldFrame>
          </View>
          <View style={styles.winnerLabelRow}>
            <GoldFrame>
              <View style={styles.winnerLabelInner}>
                <Text style={styles.winnerLabelText}>---</Text>
              </View>
            </GoldFrame>
          </View>
        </View>

        {/* Bottom choice buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissButtonText}>Do not show on Start up again...</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keepButton} onPress={handleKeep}>
            <Text style={styles.keepButtonText}>I might need a refresher...</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
    paddingBottom: 100,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 50,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8E0DD3',
    textAlign: 'center',
    flex: 1,
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
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  hamburgerText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },

  // Gold header text box
  goldHeaderBox: {
    backgroundColor: '#0a0e27',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  goldHeaderText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Shared title row
  boxTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  // Manifest (Pink)
  manifestBorder: {
    borderWidth: 5,
    borderColor: '#ff7795',
    borderRadius: 11,
    marginBottom: 12,
  },
  manifestBox: {
    backgroundColor: '#ffe4ed',
    padding: 16,
    borderRadius: 6,
  },
  manifestTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#660008',
  },
  manifestNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#660008',
  },
  manifestText: {
    fontSize: 15,
    color: '#660008',
    lineHeight: 21,
  },

  // Art (Cream)
  artBorder: {
    borderWidth: 5,
    borderColor: '#f7bc6e',
    borderRadius: 11,
    marginBottom: 12,
  },
  artBox: {
    backgroundColor: '#ffecd3',
    padding: 16,
    borderRadius: 6,
  },
  artTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#061679',
  },
  artNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#061679',
  },
  artText: {
    fontSize: 15,
    color: '#061679',
    lineHeight: 21,
  },

  // Goals (Yellow)
  goalBorder: {
    borderWidth: 5,
    borderColor: '#b4924a',
    borderRadius: 11,
    marginBottom: 12,
  },
  goalBox: {
    backgroundColor: '#faf5b5',
    padding: 16,
    borderRadius: 6,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#b4924a',
  },
  goalNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#b4924a',
  },
  goalText: {
    fontSize: 15,
    color: '#b4924a',
    lineHeight: 21,
  },

  // Inspire (Green)
  inspireBorder: {
    borderWidth: 5,
    borderColor: '#004225',
    borderRadius: 11,
    marginBottom: 16,
  },
  inspireBox: {
    backgroundColor: 'rgba(207, 232, 199, 0.5)',
    padding: 16,
    borderRadius: 6,
  },
  inspireTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#004225',
  },
  inspireNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#004225',
  },
  inspireText: {
    fontSize: 15,
    color: '#004225',
    lineHeight: 21,
  },

  // Winner showcase
  showcaseSection: {
    marginBottom: 16,
  },
  galleryButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  galleryButtonLeft: {
    width: '20%',
    alignItems: 'flex-end',
  },
  galleryButtonRight: {
    width: '20%',
    alignItems: 'flex-start',
  },
  galleryButtonInner: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  galleryButtonText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontSize: 14,
    fontWeight: '600',
  },
  winnerFrameContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  placeholderFrame: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
  },
  placeholderText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  winnerLabelRow: {
    alignItems: 'center',
    marginTop: 5,
  },
  winnerLabelInner: {
    backgroundColor: '#004225',
    paddingHorizontal: 25,
    paddingVertical: 10,
  },
  winnerLabelText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Courage (Gold shimmer)
  courageContainer: {
    marginBottom: 12,
    borderRadius: 11,
    overflow: 'hidden',
  },
  courageGradient: {
    padding: 16,
    borderRadius: 11,
  },
  courageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050d61',
  },
  courageNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050d61',
  },
  courageText: {
    fontSize: 15,
    color: '#050d61',
    lineHeight: 21,
  },

  // Connect (Blue)
  connectBorder: {
    borderWidth: 5,
    borderColor: '#050d61',
    borderRadius: 11,
    marginBottom: 24,
  },
  connectBox: {
    backgroundColor: 'rgba(184, 200, 232, 0.5)',
    padding: 16,
    borderRadius: 6,
  },
  connectTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050d61',
  },
  connectNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050d61',
  },
  connectText: {
    fontSize: 15,
    color: '#050d61',
    lineHeight: 21,
  },

  // Bottom buttons
  bottomButtons: {
    gap: 12,
  },
  dismissButton: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#B8860B',
    padding: 16,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#050d61',
    fontSize: 16,
    fontWeight: '600',
  },
  keepButton: {
    backgroundColor: 'rgba(24, 112, 162, 0.5)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#B8860B',
    padding: 16,
    alignItems: 'center',
  },
  keepButtonText: {
    color: '#050d61',
    fontSize: 16,
    fontWeight: '600',
  },
});

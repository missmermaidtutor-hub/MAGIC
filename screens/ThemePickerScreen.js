import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { THEME_ORDER, THEMES } from '../themes/themes';
import ThemedBackground from '../components/ThemedBackground';

// Mini preview swatch for each theme
function ThemeSwatch({ themeData }) {
  const bg = themeData.background;
  const swatchStyle = [styles.swatch];

  if (bg.type === 'gradient') {
    return (
      <LinearGradient
        colors={bg.colors}
        start={bg.start || { x: 0, y: 0 }}
        end={bg.end || { x: 0, y: 1 }}
        style={swatchStyle}
      >
        <View style={[styles.swatchFrame, { borderColor: themeData.frame.innerBorder }]} />
        <Text style={[styles.swatchLetters]}>
          <Text style={{ color: '#78000E' }}>M</Text>
          <Text style={{ color: '#9E4502' }}>A</Text>
          <Text style={{ color: '#c1a900' }}>G</Text>
          <Text style={{ color: '#3c9820' }}>I</Text>
          <Text style={{ color: '#8B5CF6' }}>C</Text>
        </Text>
      </LinearGradient>
    );
  }

  return (
    <View style={[swatchStyle, { backgroundColor: bg.fallbackColor || '#eee' }]}>
      <View style={[styles.swatchFrame, { borderColor: themeData.frame.innerBorder }]} />
      <Text style={styles.swatchLetters}>
        <Text style={{ color: '#78000E' }}>M</Text>
        <Text style={{ color: '#9E4502' }}>A</Text>
        <Text style={{ color: '#c1a900' }}>G</Text>
        <Text style={{ color: '#3c9820' }}>I</Text>
        <Text style={{ color: '#8B5CF6' }}>C</Text>
      </Text>
    </View>
  );
}

export default function ThemePickerScreen({ navigation }) {
  const { theme, themeId, selectTheme } = useTheme();

  const handleSelect = async (id) => {
    await selectTheme(id);
  };

  return (
    <ThemedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text.streak }]}>Choose Your Skin</Text>
        <Text style={[styles.subtitle, { color: theme.text.tagline }]}>
          Express your creative energy — the community stays the same, only the look changes.
        </Text>

        {THEME_ORDER.map(id => {
          const t = THEMES[id];
          const isActive = id === themeId;
          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.themeCard,
                {
                  borderColor: isActive ? theme.frame.innerBorder : 'rgba(150,150,150,0.3)',
                  borderWidth: isActive ? 3 : 1,
                  shadowColor: isActive ? theme.frame.outerShadow : 'transparent',
                },
              ]}
              onPress={() => handleSelect(id)}
              activeOpacity={0.8}
            >
              <ThemeSwatch themeData={t} />
              <View style={styles.themeInfo}>
                <Text style={styles.themeEmoji}>{t.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.themeName}>{t.name}</Text>
                  <Text style={styles.themeDesc}>{t.description}</Text>
                </View>
                {isActive && (
                  <Text style={[styles.activeCheck, { color: theme.frame.innerBorder }]}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.hint, { color: theme.text.tagline }]}>
          More skins coming soon ✨
        </Text>
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  themeCard: {
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  swatch: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  swatchFrame: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    bottom: 10,
    borderWidth: 2,
    borderRadius: 8,
  },
  swatchLetters: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  themeEmoji: {
    fontSize: 26,
    marginRight: 12,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  themeDesc: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
  },
  activeCheck: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 10,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

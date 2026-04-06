import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { THEME_ORDER, THEMES } from '../themes/themes';
import ThemedBackground from '../components/ThemedBackground';

// Mini gradient/color swatch showing the skin's feel
function ThemeSwatch({ themeData, size = 'full' }) {
  const bg = themeData.background;
  const h = size === 'small' ? 44 : 64;

  const inner = (
    <>
      <View style={[
        styles.swatchFrame,
        { borderColor: themeData.frame.innerBorder, borderRadius: themeData.frame.innerBorderRadius },
      ]} />
      <Text style={styles.swatchLetters}>
        <Text style={{ color: '#78000E' }}>M</Text>
        <Text style={{ color: '#9E4502' }}>A</Text>
        <Text style={{ color: '#c1a900' }}>G</Text>
        <Text style={{ color: '#3c9820' }}>I</Text>
        <Text style={{ color: '#8B5CF6' }}>C</Text>
      </Text>
    </>
  );

  if (bg.type === 'gradient') {
    return (
      <LinearGradient
        colors={bg.colors}
        start={bg.start || { x: 0, y: 0 }}
        end={bg.end || { x: 0, y: 1 }}
        style={[styles.swatch, { height: h }]}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.swatch, { height: h, backgroundColor: bg.fallbackColor || '#eee' }]}>
      {inner}
    </View>
  );
}

export default function ThemePickerScreen({ navigation }) {
  const { theme, themeId, selectTheme } = useTheme();

  return (
    <ThemedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={[styles.question, { color: theme.text.streak }]}>
          Where are you{'\n'}creating from today?
        </Text>
        <Text style={[styles.sub, { color: theme.text.tagline }]}>
          Your skin is an emotional tool — not decoration.{'\n'}
          The community stays the same. Only your view changes.
        </Text>

        {THEME_ORDER.map(id => {
          const t = THEMES[id];
          const isActive = id === themeId;
          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.card,
                {
                  borderColor: isActive ? t.frame.innerBorder : 'rgba(150,150,150,0.2)',
                  borderWidth: isActive ? 3 : 1,
                  shadowColor: isActive ? t.frame.outerShadow : 'transparent',
                },
              ]}
              onPress={() => selectTheme(id)}
              activeOpacity={0.85}
            >
              <ThemeSwatch themeData={t} />

              <View style={styles.cardBody}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardEmoji}>{t.emoji}</Text>
                  <View>
                    <Text style={styles.cardName}>{t.name}</Text>
                    <Text style={styles.cardQuestion}>"{t.question}"</Text>
                  </View>
                </View>
                {isActive && (
                  <Text style={[styles.activeCheck, { color: t.frame.innerBorder }]}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.hint, { color: theme.text.tagline }]}>
          More skins coming with new seasons ✨
        </Text>
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 64, paddingBottom: 48 },

  question: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 10,
  },
  sub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 10,
  },

  card: {
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: 'rgba(128,128,128,0.05)',
  },
  swatch: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  swatchFrame: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    bottom: 8,
    borderWidth: 1.5,
  },
  swatchLetters: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
  },

  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  cardQuestion: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
  },
  activeCheck: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 8,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});

// ThemedBackground — drop-in replacement for ImageBackground on any screen.
//
// Usage (migrating a screen):
//   BEFORE:
//     import { ImageBackground } from 'react-native';
//     <ImageBackground source={require('../assets/background.png')} style={styles.container} resizeMode="cover">
//
//   AFTER:
//     import ThemedBackground from '../components/ThemedBackground';
//     <ThemedBackground style={styles.container}>
//
// The component reads the active theme and renders either a gradient or image background.
// The MAGIC letter colors in each box do NOT change — only the shell around them does.

import React from 'react';
import { ImageBackground, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function ThemedBackground({ style, children, resizeMode = 'cover' }) {
  const { theme } = useTheme();
  const bg = theme.background;

  if (bg.type === 'image') {
    return (
      <ImageBackground source={bg.source} style={[styles.fill, style]} resizeMode={resizeMode}>
        {children}
      </ImageBackground>
    );
  }

  // Gradient background
  return (
    <LinearGradient
      colors={bg.colors}
      start={bg.start || { x: 0, y: 0 }}
      end={bg.end || { x: 0, y: 1 }}
      style={[styles.fill, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

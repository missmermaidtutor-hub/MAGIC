import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, DEFAULT_THEME_ID } from '../themes/themes';
// DEFAULT_THEME_ID = 'celestial' — existing users get their familiar skin

const STORAGE_KEY = 'magic_theme_id';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  // Load saved theme on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved && THEMES[saved]) setThemeId(saved);
      })
      .catch(() => {});
  }, []);

  const selectTheme = async (id) => {
    if (!THEMES[id]) return;
    setThemeId(id);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, id);
    } catch (e) {}
  };

  const theme = THEMES[themeId];

  return (
    <ThemeContext.Provider value={{ theme, themeId, selectTheme, allThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook — call in any screen to get the active theme
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

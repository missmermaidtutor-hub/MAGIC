// ============================================================
// MAGIC THEME DEFINITIONS
// ============================================================
// Each theme controls the visual skin of the entire app.
// The MAGIC letter colors (M/A/G/I/C) are fixed brand identities
// and do NOT change between themes. Everything else can vary.
//
// To add a new theme:
//   1. Copy an existing entry below
//   2. Give it a unique id, name, description, and emoji
//   3. Fill in your color values
//   4. Add require() for a background image, OR use gradient type
//   5. Add the id to THEME_ORDER so it appears in the picker
// ============================================================

export const THEMES = {
  // ── 1. CELESTIAL (default) ──────────────────────────────
  celestial: {
    id: 'celestial',
    name: 'Celestial',
    description: 'Light and airy — like creating in an open sky',
    emoji: '☁️',

    background: {
      type: 'image',
      source: require('../assets/background.png'),
      fallbackColor: '#d8eef8',
    },

    // Card frame borders
    frame: {
      outerShadow: '#FFD700',          // gold glow on cards
      innerBorder: '#DAA520',          // inner gold border inside cards
      innerBorderRadius: 6,
    },

    // Tab bar at the bottom
    tabBar: {
      background: 'rgba(10, 14, 39, 0.92)',
      activeTint: '#B8860B',
      inactiveTint: '#888',
      borderTop: '#DAA520',
    },

    // Navigation header (hamburger area)
    header: {
      iconColor: '#B8860B',
    },

    // General text colors for UI chrome (not MAGIC box text)
    text: {
      streak: '#143fb8',               // "5 day streak" count
      tagline: '#143fb8',              // "Reach for a star everyday"
      winnerDate: '#8B4513',
      winnerName: '#8B4513',
    },

    // Modal overlays
    modal: {
      background: 'rgba(255,255,255,0.97)',
      border: '#DAA520',
      titleColor: '#1a1a2e',
      bodyColor: '#333',
    },

    // Buttons (primary action buttons, not MAGIC-colored ones)
    button: {
      primary: '#B8860B',
      primaryText: '#fff',
      secondary: 'transparent',
      secondaryText: '#B8860B',
      secondaryBorder: '#B8860B',
      destructive: '#cc0000',
      destructiveText: '#fff',
    },

    // Text inputs
    input: {
      background: 'rgba(255,255,255,0.8)',
      border: '#DAA520',
      text: '#1a1a2e',
      placeholder: '#888',
    },

    // Loading screen
    loading: {
      background: '#d8eef8',
      indicator: '#FFD700',
    },
  },

  // ── 2. MIDNIGHT MUSE ────────────────────────────────────
  midnightMuse: {
    id: 'midnightMuse',
    name: 'Midnight Muse',
    description: 'Deep and dreamy — create by moonlight',
    emoji: '🌙',

    background: {
      type: 'gradient',
      colors: ['#0d0d2b', '#1a0a3d', '#0d1a3a'],
      start: { x: 0, y: 0 },
      end: { x: 0.4, y: 1 },
      fallbackColor: '#0d0d2b',
    },

    frame: {
      outerShadow: '#C0C0C0',          // silver glow
      innerBorder: '#9e9e9e',          // silver inner border
      innerBorderRadius: 6,
    },

    tabBar: {
      background: 'rgba(5, 5, 20, 0.96)',
      activeTint: '#C0C0C0',
      inactiveTint: '#555',
      borderTop: '#9e9e9e',
    },

    header: {
      iconColor: '#C0C0C0',
    },

    text: {
      streak: '#b0c4de',
      tagline: '#b0c4de',
      winnerDate: '#c8c8e8',
      winnerName: '#c8c8e8',
    },

    modal: {
      background: 'rgba(13, 13, 43, 0.97)',
      border: '#9e9e9e',
      titleColor: '#e8e8ff',
      bodyColor: '#c0c0d0',
    },

    button: {
      primary: '#9e9e9e',
      primaryText: '#0d0d2b',
      secondary: 'transparent',
      secondaryText: '#C0C0C0',
      secondaryBorder: '#9e9e9e',
      destructive: '#cc0000',
      destructiveText: '#fff',
    },

    input: {
      background: 'rgba(255,255,255,0.08)',
      border: '#9e9e9e',
      text: '#e8e8ff',
      placeholder: '#666',
    },

    loading: {
      background: '#0d0d2b',
      indicator: '#C0C0C0',
    },
  },

  // ── 3. FOREST SPIRIT ────────────────────────────────────
  forestSpirit: {
    id: 'forestSpirit',
    name: 'Forest Spirit',
    description: 'Rooted and alive — art grows from the earth',
    emoji: '🌿',

    background: {
      type: 'gradient',
      colors: ['#e8f5e9', '#c8e6c9', '#a5d6a7'],
      start: { x: 0, y: 0 },
      end: { x: 0.2, y: 1 },
      fallbackColor: '#e8f5e9',
    },

    frame: {
      outerShadow: '#8B4513',          // saddle brown glow
      innerBorder: '#a0522d',          // sienna inner border
      innerBorderRadius: 6,
    },

    tabBar: {
      background: 'rgba(20, 50, 20, 0.94)',
      activeTint: '#a0522d',
      inactiveTint: '#666',
      borderTop: '#a0522d',
    },

    header: {
      iconColor: '#a0522d',
    },

    text: {
      streak: '#2e5a1e',
      tagline: '#2e5a1e',
      winnerDate: '#5d4037',
      winnerName: '#5d4037',
    },

    modal: {
      background: 'rgba(240,248,240,0.97)',
      border: '#a0522d',
      titleColor: '#1b3a1b',
      bodyColor: '#3a3a2a',
    },

    button: {
      primary: '#a0522d',
      primaryText: '#fff',
      secondary: 'transparent',
      secondaryText: '#a0522d',
      secondaryBorder: '#a0522d',
      destructive: '#8b0000',
      destructiveText: '#fff',
    },

    input: {
      background: 'rgba(255,255,255,0.75)',
      border: '#a0522d',
      text: '#1b3a1b',
      placeholder: '#888',
    },

    loading: {
      background: '#c8e6c9',
      indicator: '#a0522d',
    },
  },

  // ── 4. GOLDEN HOUR ──────────────────────────────────────
  goldenHour: {
    id: 'goldenHour',
    name: 'Golden Hour',
    description: 'Warm and glowing — the magic hour of creation',
    emoji: '🌅',

    background: {
      type: 'gradient',
      colors: ['#fff3e0', '#ffe0b2', '#ffccbc'],
      start: { x: 0.3, y: 0 },
      end: { x: 0, y: 1 },
      fallbackColor: '#fff3e0',
    },

    frame: {
      outerShadow: '#e65100',          // deep orange glow
      innerBorder: '#bf360c',          // burnt sienna inner border
      innerBorderRadius: 6,
    },

    tabBar: {
      background: 'rgba(50, 20, 5, 0.93)',
      activeTint: '#ff8f00',
      inactiveTint: '#777',
      borderTop: '#bf360c',
    },

    header: {
      iconColor: '#bf360c',
    },

    text: {
      streak: '#bf360c',
      tagline: '#bf360c',
      winnerDate: '#6d2c00',
      winnerName: '#6d2c00',
    },

    modal: {
      background: 'rgba(255,248,240,0.97)',
      border: '#bf360c',
      titleColor: '#4e1500',
      bodyColor: '#5d3a1a',
    },

    button: {
      primary: '#bf360c',
      primaryText: '#fff',
      secondary: 'transparent',
      secondaryText: '#bf360c',
      secondaryBorder: '#bf360c',
      destructive: '#7f0000',
      destructiveText: '#fff',
    },

    input: {
      background: 'rgba(255,255,255,0.75)',
      border: '#bf360c',
      text: '#4e1500',
      placeholder: '#aaa',
    },

    loading: {
      background: '#ffe0b2',
      indicator: '#ff8f00',
    },
  },

  // ── 5. CRYSTAL ──────────────────────────────────────────
  crystal: {
    id: 'crystal',
    name: 'Crystal',
    description: 'Clear and luminous — pure creative clarity',
    emoji: '💎',

    background: {
      type: 'gradient',
      colors: ['#ffffff', '#f0f4ff', '#e8f0fe'],
      start: { x: 0, y: 0 },
      end: { x: 0.3, y: 1 },
      fallbackColor: '#f0f4ff',
    },

    frame: {
      outerShadow: '#7c83bc',          // periwinkle glow
      innerBorder: '#9fa8da',          // soft indigo inner border
      innerBorderRadius: 6,
    },

    tabBar: {
      background: 'rgba(30, 30, 60, 0.92)',
      activeTint: '#9fa8da',
      inactiveTint: '#777',
      borderTop: '#9fa8da',
    },

    header: {
      iconColor: '#5c6bc0',
    },

    text: {
      streak: '#3949ab',
      tagline: '#3949ab',
      winnerDate: '#4a4a8a',
      winnerName: '#4a4a8a',
    },

    modal: {
      background: 'rgba(248,249,255,0.98)',
      border: '#9fa8da',
      titleColor: '#1a237e',
      bodyColor: '#3a3a6a',
    },

    button: {
      primary: '#5c6bc0',
      primaryText: '#fff',
      secondary: 'transparent',
      secondaryText: '#5c6bc0',
      secondaryBorder: '#9fa8da',
      destructive: '#c62828',
      destructiveText: '#fff',
    },

    input: {
      background: 'rgba(255,255,255,0.85)',
      border: '#9fa8da',
      text: '#1a237e',
      placeholder: '#9fa8da',
    },

    loading: {
      background: '#f0f4ff',
      indicator: '#9fa8da',
    },
  },
};

// Order themes appear in the picker
export const THEME_ORDER = [
  'celestial',
  'midnightMuse',
  'forestSpirit',
  'goldenHour',
  'crystal',
];

export const DEFAULT_THEME_ID = 'celestial';

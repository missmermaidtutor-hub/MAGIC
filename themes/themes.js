// ============================================================
// MAGIC SKIN DEFINITIONS
// ============================================================
// Each skin maps to a creative motivation, not a demographic.
// The five skins together cover the full creative spectrum:
//
//   Atelier        → Authenticity    (traditional artists)
//   Sanctuary      → Reflection      (writers / poets)
//   Digital        → Expression      (modern / tech creatives)
//   Mindful        → Safety          (habit builders / wellness)
//   Minimal Lab    → Focus           (precision thinkers)
//
// WHAT STAYS FIXED ACROSS ALL SKINS:
//   The MAGIC letter colors: M=#78000E  A=#9E4502  G=#c1a900  I=#3c9820  C=#8B5CF6
//   These are the community identity — every member shares them.
//
// WHAT YOU CUSTOMIZE PER SKIN:
//   background  — gradient colors OR image source
//   frame       — outerShadow (card glow), innerBorder (inner border line)
//   tabBar      — background, activeTint, inactiveTint, borderTop
//   header      — hamburger icon color
//   text        — streak count, tagline, winner display colors
//   modal       — overlay background, border, title/body text
//   button      — primary action buttons (not MAGIC-colored)
//   input       — text input fields
//   loading     — loading screen
//
// HOW TO ADD A NEW SKIN:
//   1. Copy one block below
//   2. Give it a unique id, name, question, emoji
//   3. Replace the TODO color values with your palette
//   4. Add the id to THEME_ORDER at the bottom
// ============================================================

export const THEMES = {

  // ── ATELIER ─────────────────────────────────────────────
  // Emotional need: Authenticity
  // Creative type: Traditional artists
  // Feel: warm studio, linen canvas, natural light, oil paint
  // Question answer: "I want to feel like an artist"
  atelier: {
    id: 'atelier',
    name: 'Atelier',
    question: 'I want to feel like an artist',
    emoji: '🎨',

    background: {
      type: 'gradient',
      // TODO: replace with your canvas/linen palette
      colors: ['#fdf6ec', '#f5e6cc', '#ede0c4'],
      start: { x: 0.2, y: 0 },
      end: { x: 0, y: 1 },
      fallbackColor: '#fdf6ec',
    },

    frame: {
      // TODO: adjust for warmth — terracotta, umber, gold
      outerShadow: '#8B4513',
      innerBorder: '#a0522d',
      innerBorderRadius: 6,
    },

    tabBar: {
      // TODO: dark warm base for contrast
      background: 'rgba(40, 20, 5, 0.94)',
      activeTint: '#a0522d',
      inactiveTint: '#777',
      borderTop: '#a0522d',
    },

    header: {
      iconColor: '#8B4513',
    },

    text: {
      // TODO: deep warm tones for readability on light canvas
      streak: '#5c3010',
      tagline: '#5c3010',
      winnerDate: '#7a3b0e',
      winnerName: '#7a3b0e',
    },

    modal: {
      background: 'rgba(253, 246, 236, 0.97)',
      border: '#a0522d',
      titleColor: '#3b1f08',
      bodyColor: '#5a3a1a',
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
      text: '#3b1f08',
      placeholder: '#b09070',
    },

    loading: {
      background: '#f5e6cc',
      indicator: '#a0522d',
    },
  },

  // ── WRITER'S SANCTUARY ──────────────────────────────────
  // Emotional need: Reflection
  // Creative type: Writers, poets, journalers
  // Feel: candlelit library, ink, deep quiet, old paper
  // Question answer: "I want to think and write"
  writersSanctuary: {
    id: 'writersSanctuary',
    name: "Writer's Sanctuary",
    question: 'I want to think and write',
    emoji: '✍️',

    background: {
      type: 'gradient',
      // TODO: deep quiet tones — midnight, deep teal, dark indigo
      colors: ['#0f1923', '#1a2535', '#0d1520'],
      start: { x: 0, y: 0 },
      end: { x: 0.3, y: 1 },
      fallbackColor: '#0f1923',
    },

    frame: {
      // TODO: warm candlelight amber against the dark
      outerShadow: '#c8960c',
      innerBorder: '#a87020',
      innerBorderRadius: 6,
    },

    tabBar: {
      background: 'rgba(5, 8, 15, 0.97)',
      activeTint: '#c8960c',
      inactiveTint: '#444',
      borderTop: '#a87020',
    },

    header: {
      iconColor: '#c8960c',
    },

    text: {
      // TODO: warm parchment text reads well on dark backgrounds
      streak: '#d4b483',
      tagline: '#d4b483',
      winnerDate: '#c8a870',
      winnerName: '#c8a870',
    },

    modal: {
      background: 'rgba(15, 22, 35, 0.97)',
      border: '#a87020',
      titleColor: '#f0e0b0',
      bodyColor: '#c8b890',
    },

    button: {
      primary: '#a87020',
      primaryText: '#fff',
      secondary: 'transparent',
      secondaryText: '#c8960c',
      secondaryBorder: '#a87020',
      destructive: '#cc2200',
      destructiveText: '#fff',
    },

    input: {
      background: 'rgba(255,255,255,0.07)',
      border: '#a87020',
      text: '#f0e0b0',
      placeholder: '#806040',
    },

    loading: {
      background: '#0f1923',
      indicator: '#c8960c',
    },
  },

  // ── DIGITAL CREATOR ──────────────────────────────────────
  // Emotional need: Expression
  // Creative type: Modern / digital / tech creatives, streamers
  // Feel: electric, high contrast, neon on dark, kinetic energy
  // Question answer: "I want energy and expression"
  digitalCreator: {
    id: 'digitalCreator',
    name: 'Digital Creator',
    question: 'I want energy and expression',
    emoji: '⚡',

    background: {
      type: 'gradient',
      // TODO: very dark base with electric undertone
      colors: ['#050510', '#0a0520', '#020215'],
      start: { x: 0, y: 0 },
      end: { x: 0.5, y: 1 },
      fallbackColor: '#050510',
    },

    frame: {
      // TODO: electric cyan or magenta for that neon-on-dark pop
      outerShadow: '#00e5ff',
      innerBorder: '#00b8d4',
      innerBorderRadius: 6,
    },

    tabBar: {
      background: 'rgba(2, 2, 12, 0.98)',
      activeTint: '#00e5ff',
      inactiveTint: '#333',
      borderTop: '#00b8d4',
    },

    header: {
      iconColor: '#00e5ff',
    },

    text: {
      // TODO: bright cool-toned text for dark environment
      streak: '#80deea',
      tagline: '#80deea',
      winnerDate: '#b2ebf2',
      winnerName: '#b2ebf2',
    },

    modal: {
      background: 'rgba(5, 5, 20, 0.97)',
      border: '#00b8d4',
      titleColor: '#e0f7fa',
      bodyColor: '#80deea',
    },

    button: {
      primary: '#00b8d4',
      primaryText: '#000',
      secondary: 'transparent',
      secondaryText: '#00e5ff',
      secondaryBorder: '#00b8d4',
      destructive: '#ff1744',
      destructiveText: '#fff',
    },

    input: {
      background: 'rgba(255,255,255,0.05)',
      border: '#00b8d4',
      text: '#e0f7fa',
      placeholder: '#005f6b',
    },

    loading: {
      background: '#050510',
      indicator: '#00e5ff',
    },
  },

  // ── MINDFUL CREATOR ──────────────────────────────────────
  // Emotional need: Safety
  // Creative type: Habit builders, wellness practitioners
  // Feel: gentle, grounded, soft morning light, breath, ritual
  // Question answer: "I need calm to create"
  mindfulCreator: {
    id: 'mindfulCreator',
    name: 'Mindful Creator',
    question: 'I need calm to create',
    emoji: '🌿',

    background: {
      type: 'gradient',
      // TODO: soft sage, mist, pale lavender — nothing harsh
      colors: ['#f0f5f0', '#e0ede8', '#dde8e0'],
      start: { x: 0, y: 0 },
      end: { x: 0.2, y: 1 },
      fallbackColor: '#f0f5f0',
    },

    frame: {
      // TODO: muted earthy tones — sage green, dusty teal
      outerShadow: '#5a8a70',
      innerBorder: '#7aaa88',
      innerBorderRadius: 8,
    },

    tabBar: {
      background: 'rgba(20, 45, 30, 0.92)',
      activeTint: '#7aaa88',
      inactiveTint: '#667',
      borderTop: '#5a8a70',
    },

    header: {
      iconColor: '#5a8a70',
    },

    text: {
      // TODO: deep but gentle — forest tones, not stark black
      streak: '#2e5040',
      tagline: '#2e5040',
      winnerDate: '#3a6050',
      winnerName: '#3a6050',
    },

    modal: {
      background: 'rgba(240, 248, 242, 0.97)',
      border: '#7aaa88',
      titleColor: '#1a3528',
      bodyColor: '#3a5a48',
    },

    button: {
      primary: '#5a8a70',
      primaryText: '#fff',
      secondary: 'transparent',
      secondaryText: '#5a8a70',
      secondaryBorder: '#7aaa88',
      destructive: '#8b0000',
      destructiveText: '#fff',
    },

    input: {
      background: 'rgba(255,255,255,0.7)',
      border: '#7aaa88',
      text: '#1a3528',
      placeholder: '#8aaa98',
    },

    loading: {
      background: '#e0ede8',
      indicator: '#7aaa88',
    },
  },

  // ── MINIMALIST LAB ───────────────────────────────────────
  // Emotional need: Focus
  // Creative type: Precision thinkers, designers, architects
  // Feel: Bauhaus, stark white, single accent, no noise
  // Question answer: "I need to focus"
  minimalistLab: {
    id: 'minimalistLab',
    name: 'Minimalist Lab',
    question: 'I need to focus',
    emoji: '🧠',

    background: {
      type: 'gradient',
      // TODO: near-white to very light cool gray — pure, stark
      colors: ['#ffffff', '#f5f5f7', '#efefef'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      fallbackColor: '#f5f5f7',
    },

    frame: {
      // TODO: single clean accent — charcoal, or deep blue, or pure black
      outerShadow: '#1c1c1e',
      innerBorder: '#3a3a3c',
      innerBorderRadius: 4,
    },

    tabBar: {
      background: 'rgba(10, 10, 12, 0.95)',
      activeTint: '#f5f5f7',
      inactiveTint: '#555',
      borderTop: '#3a3a3c',
    },

    header: {
      iconColor: '#1c1c1e',
    },

    text: {
      // TODO: pure dark text on white — maximum readability
      streak: '#1c1c1e',
      tagline: '#3a3a3c',
      winnerDate: '#2c2c2e',
      winnerName: '#2c2c2e',
    },

    modal: {
      background: 'rgba(255,255,255,0.99)',
      border: '#3a3a3c',
      titleColor: '#1c1c1e',
      bodyColor: '#3a3a3c',
    },

    button: {
      primary: '#1c1c1e',
      primaryText: '#fff',
      secondary: 'transparent',
      secondaryText: '#1c1c1e',
      secondaryBorder: '#3a3a3c',
      destructive: '#c62828',
      destructiveText: '#fff',
    },

    input: {
      background: '#fff',
      border: '#3a3a3c',
      text: '#1c1c1e',
      placeholder: '#aeaeb2',
    },

    loading: {
      background: '#f5f5f7',
      indicator: '#1c1c1e',
    },
  },
};

// Order skins appear in the picker
// This is also the order of the emotional spectrum:
//   analog warmth → introspective → energetic → calm → focused
export const THEME_ORDER = [
  'atelier',
  'writersSanctuary',
  'digitalCreator',
  'mindfulCreator',
  'minimalistLab',
];

export const DEFAULT_THEME_ID = 'atelier';

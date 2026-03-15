// Tool types
export const TOOLS = {
  PEN: 'pen',
  MARKER: 'marker',
  HIGHLIGHTER: 'highlighter',
  ERASER: 'eraser',
  LINE: 'line',
  RECT: 'rect',
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
  TEXT: 'text',
};

// Brush presets per tool type
export const BRUSH_PRESETS = {
  [TOOLS.PEN]: { opacity: 1.0, lineCap: 'round', lineJoin: 'round' },
  [TOOLS.MARKER]: { opacity: 0.6, lineCap: 'round', lineJoin: 'round' },
  [TOOLS.HIGHLIGHTER]: { opacity: 0.3, lineCap: 'square', lineJoin: 'miter' },
  [TOOLS.ERASER]: { opacity: 1.0, lineCap: 'round', lineJoin: 'round' },
};

// Default brush sizes
export const BRUSH_SIZES = [
  { label: 'S', value: 3 },
  { label: 'M', value: 8 },
  { label: 'L', value: 16 },
  { label: 'XL', value: 28 },
];

// Color palette
export const COLORS = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#FF7F00', // Orange
  '#FFD700', // Gold
  '#FFFF00', // Yellow
  '#22C55E', // Green
  '#00BFFF', // Sky blue
  '#0000FF', // Blue
  '#8B00FF', // Violet
  '#FF69B4', // Pink
  '#8B4513', // Brown
];

// Shape tool types
export const SHAPE_TOOLS = [TOOLS.LINE, TOOLS.RECT, TOOLS.CIRCLE, TOOLS.TRIANGLE];

// Freehand tool types
export const FREEHAND_TOOLS = [TOOLS.PEN, TOOLS.MARKER, TOOLS.HIGHLIGHTER, TOOLS.ERASER];

// Default state
export const DEFAULT_BRUSH_COLOR = '#000000';
export const DEFAULT_BRUSH_SIZE = 5;
export const DEFAULT_OPACITY = 1.0;
export const DEFAULT_BACKGROUND = '#FFFFFF';

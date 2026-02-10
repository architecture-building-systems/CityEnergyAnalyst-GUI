/**
 * Utility functions for generating and managing construction standard colors
 */

// Predefined palette of distinct, visually pleasing colors
const PREDEFINED_COLORS = [
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#E91E63', // Pink
  '#8BC34A', // Light Green
  '#3F51B5', // Indigo
  '#FF5722', // Deep Orange
  '#009688', // Teal
  '#673AB7', // Deep Purple
  '#FFEB3B', // Yellow
  '#795548', // Brown
  '#607D8B', // Blue Grey
];

/**
 * Generate a seeded random number for consistent color generation
 * Uses a simple hash function based on the string
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Generate a color for a construction standard
 * Uses hash-based palette assignment for stability (same standard = same color)
 * regardless of what other standards are present in the zone
 */
export const generateColorForStandard = (standardName) => {
  const hash = hashString(standardName);
  
  // Use hash to derive a stable palette index
  const paletteIndex = hash % PREDEFINED_COLORS.length;
  
  // Check if this standard can use the predefined palette
  // The palette provides the most visually distinct colors
  if (paletteIndex < PREDEFINED_COLORS.length) {
    return PREDEFINED_COLORS[paletteIndex];
  }

  // Fall back to generated colors (shouldn't reach here with modulo, but kept for safety)
  const hue = hash % 360;
  const saturation = 60 + (hash % 20); // 60-80%
  const lightness = 45 + (hash % 15); // 45-60%

  return hslToHex(hue, saturation, lightness);
};

/**
 * Convert HSL to Hex color
 */
const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

/**
 * Convert hex color to RGB array (for deck.gl)
 */
export const hexToRgbArray = (hex) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return [r, g, b, 255];
};

/**
 * Generate a color map for all unique construction standards found in buildings
 * Returns an object mapping standard names to hex colors
 */
export const generateConstructionColorMap = (features) => {
  if (!features || !features.length) return {};

  // Extract unique construction standards
  const uniqueStandards = new Set();
  features.forEach((feature) => {
    const constType = feature?.properties?.const_type;
    if (constType) {
      uniqueStandards.add(constType);
    }
  });

  // Sort standards for consistent ordering
  const sortedStandards = Array.from(uniqueStandards).sort();

  // Generate colors for each standard (no index needed - colors derived from name)
  const colorMap = {};
  sortedStandards.forEach((standard) => {
    colorMap[standard] = generateColorForStandard(standard);
  });

  return colorMap;
};

/**
 * Get the RGB color array for a building based on its construction standard
 */
export const getBuildingColorByStandard = (constType, colorMap) => {
  if (!constType || !colorMap[constType]) {
    // Return gray for unknown/missing construction types
    return [128, 128, 128, 255];
  }
  return hexToRgbArray(colorMap[constType]);
};

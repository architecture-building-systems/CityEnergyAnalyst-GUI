/**
 * Utility functions for generating and managing construction standard colors
 */

import * as turf from '@turf/turf';

import { hexToRgb } from './index';

// CEA light colour palette for construction archetypes
const PREDEFINED_COLORS = [
  '#f6958f', // Red light
  '#97d6d7', // Blue light
  '#ffe185', // Yellow light
  '#c9b787', // Brown light
  '#c695a7', // Purple light
  '#b2dbb7', // Green light
  '#fab185', // Orange light
  '#66cdaa', // Teal light
  '#84def4', // Cyan light
  '#ff99ff', // Magenta light
  '#ffb6c1', // Pink light
  '#bdb76b', // Olive light
  '#6495ed', // Navy light
  '#8a2be2', // Indigo light
  '#a2a1a6', // Grey light
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
 * Generate a color for a construction standard based on its index in the sorted list.
 * The first N standards get visually distinct predefined palette colors.
 * Standards beyond the palette size get deterministic hash-derived HSL colors.
 */
export const generateColorForStandard = (standardName, index) => {
  // Use predefined palette for the first N standards (maximally distinct)
  if (index < PREDEFINED_COLORS.length) {
    return PREDEFINED_COLORS[index];
  }

  // Fall back to hash-derived HSL for additional standards beyond the palette
  const hash = hashString(standardName);
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

  // Generate colors for each standard (index determines palette assignment)
  const colorMap = {};
  sortedStandards.forEach((standard, index) => {
    colorMap[standard] = generateColorForStandard(standard, index);
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
  return hexToRgb(colorMap[constType]);
};

/**
 * Get the main use type for a building feature.
 * The main use type is whichever of use_type1/2/3 has the highest ratio.
 * If tied, use the one that comes first (1 before 2 before 3).
 */
export const getMainUseType = (properties) => {
  const types = [
    {
      type: properties?.use_type1,
      ratio: parseFloat(properties?.use_type1r) || 0,
    },
    {
      type: properties?.use_type2,
      ratio: parseFloat(properties?.use_type2r) || 0,
    },
    {
      type: properties?.use_type3,
      ratio: parseFloat(properties?.use_type3r) || 0,
    },
  ];
  if (types.every(({ ratio }) => ratio === 0)) return null;
  const best = types.reduce((a, b) => (b.ratio > a.ratio ? b : a), types[0]);
  return best?.type || null;
};

/**
 * Generate a color map for all unique main use types found in buildings
 */
export const generateUseTypeColorMap = (features) => {
  if (!features || !features.length) return {};

  const uniqueTypes = new Set();
  features.forEach((feature) => {
    const mainUse = getMainUseType(feature?.properties);
    if (mainUse) {
      uniqueTypes.add(mainUse);
    }
  });

  const sortedTypes = Array.from(uniqueTypes).sort();
  const colorMap = {};
  sortedTypes.forEach((type, index) => {
    colorMap[type] = generateColorForStandard(type, index);
  });

  return colorMap;
};

/**
 * Get the RGB color array for a building based on its main use type
 */
export const getBuildingColorByUseType = (properties, colorMap) => {
  const mainUse = getMainUseType(properties);
  if (!mainUse || !colorMap[mainUse]) {
    return [128, 128, 128, 255];
  }
  return hexToRgb(colorMap[mainUse]);
};

/**
 * Gross floor area (m²) for a single zone feature.
 *
 * Mirrors CEA's authoritative formula in
 * ``cea/demand/building_properties/useful_areas.py``::
 *
 *     GFA_ag = footprint × (floors_ag − void_deck)
 *     GFA_bg = footprint × floors_bg
 *     GFA    = GFA_ag + GFA_bg
 *
 * Always available (only needs zone.shp, no upstream tool runs),
 * so the legend's GFA breakdown shows on first canvas open and
 * matches the `architecture.total_gfa_m2` KPI exactly once
 * `cea demand` produces ``Total_demand.csv``.
 *
 * Returns 0 on missing geometry / floors so callers can sum
 * defensively without filtering.
 */
const buildingGfa = (feature) => {
  if (!feature?.geometry) return 0;
  let footprint;
  try {
    footprint = turf.area(feature);
  } catch {
    return 0;
  }
  const props = feature.properties || {};
  const floorsAg = parseInt(props.floors_ag, 10);
  const voidDeck = parseInt(props.void_deck, 10) || 0;
  const floorsBg = parseInt(props.floors_bg, 10) || 0;
  if (!Number.isFinite(floorsAg) || floorsAg <= 0) return 0;
  // floors_ag − void_deck: void-deck floors have an open
  // envelope and don't count toward conditioned GFA in CEA's
  // model. floors_bg: basements DO count. Clamp to ≥ 0 in case
  // of a misconfigured zone (void_deck > floors_ag would
  // otherwise produce a negative above-ground term).
  const aboveGround = Math.max(floorsAg - voidDeck, 0);
  const belowGround = Math.max(floorsBg, 0);
  const totalFloors = aboveGround + belowGround;
  if (totalFloors <= 0) return 0;
  return footprint * totalFloors;
};

/**
 * Aggregate GFA per construction archetype across the zone.
 *
 * Returns ``{ <const_type>: { gfa, pct } }`` where ``pct`` is
 * the share of total district GFA. The legend renders the
 * value to the right of each entry as
 * ``<gfa> m² (<pct>%)`` so the user can see both the absolute
 * footprint and the relative share at a glance.
 *
 * Returns ``{}`` when no buildings carry a `const_type` or
 * computed GFA — the legend then renders the labels alone
 * (the colour swatch + name still mean something even
 * without totals).
 */
export const generateConstructionGfaTotals = (features) => {
  if (!features?.length) return {};
  const totals = {};
  let total = 0;
  for (const f of features) {
    const t = f?.properties?.const_type;
    if (!t) continue;
    const g = buildingGfa(f);
    if (g <= 0) continue;
    totals[t] = (totals[t] || 0) + g;
    total += g;
  }
  if (total <= 0) return {};
  const out = {};
  for (const [t, g] of Object.entries(totals)) {
    out[t] = { gfa: g, pct: (g / total) * 100 };
  }
  return out;
};

/**
 * Aggregate GFA per use type, weighted by each building's
 * ``use_typeNr`` ratio. A building with
 * ``use_type1=MULTI_RES, use_type1r=0.6, use_type2=OFFICE,
 * use_type2r=0.4`` contributes 60 % of its GFA to MULTI_RES
 * and 40 % to OFFICE.
 *
 * The percentages still add up to ~100 % across the legend
 * because every unit of district GFA is distributed across
 * the use-type slots (assuming each building's ratios sum
 * to ≤ 1; rounding errors aside).
 */
export const generateUseTypeGfaTotals = (features) => {
  if (!features?.length) return {};
  const totals = {};
  let total = 0;
  for (const f of features) {
    const g = buildingGfa(f);
    if (g <= 0) continue;
    const slots = [
      [f.properties?.use_type1, parseFloat(f.properties?.use_type1r)],
      [f.properties?.use_type2, parseFloat(f.properties?.use_type2r)],
      [f.properties?.use_type3, parseFloat(f.properties?.use_type3r)],
    ];
    for (const [type, ratio] of slots) {
      if (!type || !Number.isFinite(ratio) || ratio <= 0) continue;
      const contrib = g * ratio;
      totals[type] = (totals[type] || 0) + contrib;
      total += contrib;
    }
  }
  if (total <= 0) return {};
  const out = {};
  for (const [t, g] of Object.entries(totals)) {
    out[t] = { gfa: g, pct: (g / total) * 100 };
  }
  return out;
};

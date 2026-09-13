/**
 * Validation utilities for parameters
 */

/**
 * Debounce function - delays execution until after wait time has elapsed
 * since the last invocation
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Validates network name for invalid filesystem characters
 * @param {string} value - The network name to validate
 * @returns {Promise} Resolves if valid, rejects with error message if invalid
 */
export const validateNetworkNameChars = (value) => {
  const invalidChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
  const hasInvalidChars = invalidChars.some((char) => value.includes(char));

  if (hasInvalidChars) {
    return Promise.reject(
      `Network name contains invalid characters. Avoid: ${invalidChars.join(' ')}`,
    );
  }

  return Promise.resolve();
};

/**
 * Validates network name against backend (collision detection)
 * @param {Object} apiClient - Axios instance for API calls
 * @param {string} tool - Tool name (e.g., 'network-layout')
 * @param {string} value - The network name to validate
 * @param {Object} config - Current config with scenario and network_type
 * @returns {Promise} Resolves if valid, rejects with error message if invalid
 */
export const validateNetworkNameCollision = async (
  apiClient,
  tool,
  value,
  config,
) => {
  try {
    // Call backend to save config with the new network name
    // The backend's decode() method will validate for collisions
    const params = {
      'network-name': value,
      // Include dependencies for validation context
      scenario: config.scenario,
      'network-type': config.network_type,
    };

    await apiClient.post(`/tools/${tool}/save-config`, params);
    return Promise.resolve();
  } catch (error) {
    // Backend validation failed - extract error message
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Validation failed';

    return Promise.reject(errorMessage);
  }
};

/**
 * Index names for the Database Editor (a row's `code` / `name` / `const_type`).
 *
 * Several of these values become filenames (SCHEDULES_LIBRARY/{use_type}.csv,
 * FEEDSTOCKS_LIBRARY/{code}.csv), so they are restricted to Latin letters, numbers,
 * underscores and hyphens. Hyphens are included because the DE database uses them in
 * const_type (MFH-EAST_D).
 */

// Letters with no "base + accent" decomposition under NFD, so they need spelling out.
const TRANSLITERATIONS = {
  ß: 'ss',
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  ø: 'o',
  Ø: 'O',
  å: 'a',
  Å: 'A',
  ł: 'l',
  Ł: 'L',
  đ: 'd',
  Đ: 'D',
  ð: 'd',
  Ð: 'D',
  þ: 'th',
  Þ: 'Th',
};

// Derived from the map so adding an entry above is enough; all keys are inert in a class.
const TRANSLITERATION_RE = new RegExp(
  `[${Object.keys(TRANSLITERATIONS).join('')}]`,
  'g',
);

/** Longest index a user may create. CEA ships names up to 65 characters. */
export const MAX_INDEX_NAME_LENGTH = 72;

export const normaliseIndexName = (value) =>
  String(value ?? '')
    .trim()
    .replace(TRANSLITERATION_RE, (char) => TRANSLITERATIONS[char])
    // NFD splits an accented letter into base + combining mark, so dropping the marks
    // leaves the base: "Béton armé" reads Beton_arme rather than B_ton_arm.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '');

/**
 * Distinct characters `normaliseIndexName` would discard entirely, as a string; empty when
 * the name converts cleanly. Only letters and digits count — punctuation and spaces are
 * meant to become underscores, so "Rock Wool (dense)" converts rather than being refused.
 */
export const droppedCharacters = (value) =>
  [...new Set(String(value ?? '').match(/[\p{L}\p{N}]/gu) ?? [])]
    .filter((char) => !normaliseIndexName(char))
    .join('');

/** Append _1, _2, ... until the name is free. */
export const uniqueIndexName = (
  base,
  taken,
  maxLength = MAX_INDEX_NAME_LENGTH,
) => {
  if (!taken.has(base)) return base;
  let suffix = 1;
  for (;;) {
    const tail = `_${suffix}`;
    // Trim the base so a de-duplicated name respects the cap too.
    const candidate =
      base.slice(0, Math.max(1, maxLength - tail.length)) + tail;
    if (!taken.has(candidate)) return candidate;
    suffix += 1;
  }
};

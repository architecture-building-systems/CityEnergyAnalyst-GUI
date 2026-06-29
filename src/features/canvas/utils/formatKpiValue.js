/**
 * Render a KPI's numeric value + unit as one display string.
 *
 * Conventions:
 * - Auto SI prefix once magnitude crosses 1k:
 *     60_000 → "60k", 1_200_000 → "1.2M", 7e9 → "7G".
 * - Below 1k: 1–2 decimals depending on magnitude
 *     (12.34 → "12.3", 0.45 → "0.45").
 * - Pure-percentage units (`%`) keep one decimal: 30.303 → "30.3 %".
 * - `years` keeps integer: 2030.0 → "2030 years".
 * - Null / undefined / NaN renders as the em-dash placeholder
 *   used elsewhere in the app — never throws.
 *
 * Returns the value and unit pre-joined with a non-breaking space
 * so the unit never wraps to a new line away from the number.
 */

const NBSP = '\u00A0';
const PLACEHOLDER = '—';

const SI_PREFIXES = [
  { threshold: 1e12, suffix: 'T' },
  { threshold: 1e9, suffix: 'G' },
  { threshold: 1e6, suffix: 'M' },
  { threshold: 1e3, suffix: 'k' },
];

const isMissing = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === 'number' && Number.isNaN(value));

const stripPrefixSign = (n) => (n < 0 ? -n : n);

const formatNumber = (value, unit) => {
  if (isMissing(value)) return PLACEHOLDER;
  const num = Number(value);
  if (!Number.isFinite(num)) return PLACEHOLDER;

  const isPercent = unit === '%';
  const isYears = unit === 'years' || unit === 'year';

  if (isYears) {
    return String(Math.round(num));
  }
  if (isPercent) {
    // One decimal — clip trailing zero so "30.0" → "30".
    const fixed = num.toFixed(1);
    return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  }

  const magnitude = stripPrefixSign(num);
  for (const { threshold, suffix } of SI_PREFIXES) {
    if (magnitude >= threshold) {
      const scaled = num / threshold;
      // Integer once the scaled value is ≥ 10 (e.g. "60M" not
      // "60.0M"); otherwise one decimal, trimmed if it's just .0
      // ("7.0G" → "7G", "1.2M" stays "1.2M").
      const decimals = stripPrefixSign(scaled) >= 10 ? 0 : 1;
      const text = scaled.toFixed(decimals);
      const trimmed = text.endsWith('.0') ? text.slice(0, -2) : text;
      return `${trimmed}${suffix}`;
    }
  }
  // Sub-1k: 1 decimal once we're past 10, 2 below.
  return magnitude >= 10 ? num.toFixed(1) : num.toFixed(2);
};

/**
 * Public API. Pass the value and the KPI's `unit` field straight
 * from the API response.
 *   formatKpiValue(78.42, "kWh/m²/yr")  → "78.4 kWh/m²/yr"
 *   formatKpiValue(60_000_000, "kgCO2e") → "60M kgCO2e"
 *   formatKpiValue(30.303, "%")          → "30.3 %"
 *   formatKpiValue(null, "kWh/m²/yr")    → "—"
 *   formatKpiValue(NaN, "kWh/m²/yr")     → "—"
 */
export const formatKpiValue = (value, unit) => {
  const numText = formatNumber(value, unit);
  if (numText === PLACEHOLDER) return PLACEHOLDER;
  if (!unit) return numText;
  return `${numText}${NBSP}${unit}`;
};

/**
 * Number-only variant for layouts that render value and unit on
 * separate lines (the FeatureCardKpi default).
 *   formatKpiNumber(78.42, "kWh/m²/yr") → "78.4"
 */
export const formatKpiNumber = (value, unit) => formatNumber(value, unit);

/**
 * Display-unit conversion for KPI values.
 *
 * The backend always returns a KPI's value in its base unit and lists
 * the units it can be shown in on the registry entry:
 *   display_units: [{ unit: 'kWh/yr', factor: 1 }, { unit: 'MWh/yr', factor: 0.001 }]
 * The card's chosen unit (`card.displayUnit`) is presentation only, so the
 * conversion happens here and never reaches a request.
 */

const findDisplayUnit = (entry, displayUnit) =>
  displayUnit
    ? (entry?.display_units ?? []).find((u) => u.unit === displayUnit)
    : undefined;

/**
 * The unit a card shows: its saved `displayUnit` when the entry still
 * offers it, otherwise the base unit (`fallbackUnit` before the registry
 * has loaded).
 */
export const resolveDisplayUnit = (entry, displayUnit, fallbackUnit = '') =>
  findDisplayUnit(entry, displayUnit)?.unit ?? entry?.unit ?? fallbackUnit;

/**
 * Convert a base-unit value for display.
 *   convertKpiValue(3000, entry, 'MWh/yr') → { value: 3, unit: 'MWh/yr' }
 * A missing value passes through unchanged; an unknown or absent
 * `displayUnit` falls back to the base unit.
 */
export const convertKpiValue = (
  value,
  entry,
  displayUnit,
  fallbackUnit = '',
) => {
  const match = findDisplayUnit(entry, displayUnit);
  const unit = match?.unit ?? entry?.unit ?? fallbackUnit;
  if (!match || value === null || value === undefined) return { value, unit };
  const num = Number(value);
  return {
    value: Number.isFinite(num) ? num * match.factor : value,
    unit,
  };
};

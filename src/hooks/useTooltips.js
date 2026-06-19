import tooltips from 'data/tooltips.json';

// Returns the full tooltip map, matching the previous useQuery return shape.
export const useTooltips = () => ({ data: tooltips });

/**
 * Get a tooltip entry by key.
 * Returns { title, body } or { body } for simple tooltips.
 * Returns null if not found.
 */
export const useTooltip = (key) => tooltips?.[key] ?? null;

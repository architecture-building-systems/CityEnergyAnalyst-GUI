import { useMemo } from 'react';

/**
 * Tracks the values of parameters that a selector depends on.
 * Returns:
 *   - dependsOnValues: a stable JSON string of the dependent param values (changes trigger re-fetches)
 *   - dependsValid: true when all dependent params have been set (non-null/undefined)
 */
const useDependsOn = (dependsOn, mapLayerParameters) => {
  const dependsOnValues = useMemo(() => {
    if (!dependsOn) return null;
    return JSON.stringify(dependsOn.map((key) => mapLayerParameters?.[key]));
  }, [dependsOn, mapLayerParameters]);

  const dependsValid = useMemo(() => {
    if (!dependsOn) return true;
    return dependsOn.every((key) => mapLayerParameters?.[key] != null);
  }, [dependsOn, mapLayerParameters]);

  return { dependsOnValues, dependsValid };
};

export default useDependsOn;

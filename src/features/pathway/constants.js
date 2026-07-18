// Shared constants and pure helpers for the pathway feature.
// Imported by PathwayPanel, OverviewCard, BuildingLifecycleCard, and any other
// components that render pathway timelines.

export const STATUS_FILL = {
  none: '#CBD5E1',
  validated: '#CBD5E1',
  baked: '#1470AF',
  custom: '#AC6080',
  simulated: '#000000',
};

/**
 * Returns the smallest label step (in years) that keeps tick labels at least
 * 56 px apart at the given pixels-per-year scale.
 * @param {number} pxPerYear
 * @returns {number}
 */
export const getTickStep = (pxPerYear) => {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  for (const step of steps) {
    if (pxPerYear * step >= 56) return step;
  }
  return 1000;
};

/**
 * Builds the canonical `<project>/<scenario>` path used as the backend
 * `scenario_path` parameter, stripping any trailing slashes from `project`.
 * Returns null if either argument is falsy.
 * @param {string} project  Full project path
 * @param {string} scenarioName
 * @returns {string|null}
 */
const stripTrailingSlashes = (path) => {
  let end = path.length;
  while (end > 0 && (path[end - 1] === '/' || path[end - 1] === '\\')) end--;
  return path.slice(0, end);
};

export const buildScenarioPath = (project, scenarioName) => {
  if (!project || !scenarioName) return null;
  return `${stripTrailingSlashes(String(project))}/${scenarioName}`;
};

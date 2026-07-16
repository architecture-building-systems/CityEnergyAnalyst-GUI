/**
 * `X-CEA-*` scenario header names
 *
 * Kept in their own dependency-free module because `scenarioContext.js`
 * pulls in `useProjectStore`, and transitively `apiClient` from
 * `lib/api/axios.js`. `axios.js` needs these header names too (to strip
 * them in the demo client's interceptor), so importing them from
 * `scenarioContext.js` would create a circular
 * `axios.js` -> `scenarioContext.js` -> `projectStore.jsx` -> `axios.js`
 * dependency.
 */

export const PROJECT_HEADER = 'X-CEA-Project';
export const SCENARIO_NAME_HEADER = 'X-CEA-Scenario-Name';
export const CHILD_SCENARIO_HEADER = 'X-CEA-Child-Scenario';

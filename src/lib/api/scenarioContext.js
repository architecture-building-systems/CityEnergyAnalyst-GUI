/**
 * Scenario context headers for the CEA backend.
 *
 * The backend's `CEAScenario` / `CEAScenarioLenient` dependencies resolve
 * scenario context from `X-CEA-*` request headers first, falling back to
 * query params only as a deprecated compat path. Sending context as headers
 * rather than query strings avoids leaking absolute filesystem paths into
 * URLs, browser history, referrers, and server access logs.
 */

import { useProjectStore } from 'features/project/stores/projectStore';

export const PROJECT_HEADER = 'X-CEA-Project';
export const SCENARIO_NAME_HEADER = 'X-CEA-Scenario-Name';
export const CHILD_SCENARIO_HEADER = 'X-CEA-Child-Scenario';

/**
 * Build the logical child-scenario token `<pathway_name>/<year>` from a
 * `projectStore.childScenario` object (`{ pathway_name, year, ... }`).
 * Returns `null` when no child is active.
 */
export const childScenarioToken = (cs) =>
  cs?.pathway_name != null && cs?.year != null
    ? `${cs.pathway_name}/${cs.year}`
    : null;

/**
 * Build an `X-CEA-*` header object for a specific scenario.
 *
 * Only includes headers for values that are non-null/non-empty, so callers
 * can spread or pass the result directly to axios `config.headers`.
 *
 * @param {object} opts
 * @param {string|null} opts.project       - Absolute project path
 * @param {string|null} opts.scenarioName  - Bare scenario name
 * @param {object|null} opts.childScenario - `{ pathway_name, year }` or null
 * @returns {Record<string, string>}
 */
export const scenarioHeaders = ({
  project,
  scenarioName,
  childScenario,
} = {}) => {
  const headers = {};
  if (project) headers[PROJECT_HEADER] = project;
  if (scenarioName) headers[SCENARIO_NAME_HEADER] = scenarioName;
  const token = childScenarioToken(childScenario);
  if (token) headers[CHILD_SCENARIO_HEADER] = token;
  return headers;
};

/**
 * Returns `X-CEA-*` headers for the currently active scenario.
 * Reads directly from the project store at call time, so it is safe
 * to use inside async query functions and event handlers.
 */
export const activeScenarioHeaders = () => {
  const {
    project,
    scenario: scenarioName,
    childScenario,
  } = useProjectStore.getState();
  return scenarioHeaders({ project, scenarioName, childScenario });
};

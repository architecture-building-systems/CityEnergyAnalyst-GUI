import { useMemo } from 'react';

import { useProjectStore } from 'features/project/stores/projectStore';

import { scenarioRequestContext, useCanvasStore } from '../stores/canvasStore';

/**
 * `scenarioRequestContext` for a column's `scenario`, resolved against the canvas store's
 * columns: `{ scenario, childScenario }` to send in a request (parent plus state for a
 * pathway-state column). Memoised, so the result is stable across renders.
 */
export const useScenarioRequestContext = (scenario) => {
  const columns = useCanvasStore((s) => s.columns);
  const parentScenario = useCanvasStore((s) => s.parentScenario);
  return useMemo(
    () => scenarioRequestContext(columns, parentScenario, scenario),
    [columns, parentScenario, scenario],
  );
};

/**
 * The full request target of a canvas map: `{ project, scenario, childScenario }`.
 * `project` falls back to the active project; `childScenario` (`{ pathway_name, year }`)
 * targets a state of `columnScenario` for callers that are not a canvas column (e.g. a
 * pathway-multi row), and is otherwise resolved from the canvas columns.
 */
export const useColumnRequest = (
  columnScenario,
  project,
  childScenario = null,
) => {
  const activeProject = useProjectStore((s) => s.project);
  const request = useScenarioRequestContext(columnScenario);
  return {
    project: project ?? activeProject,
    scenario: request.scenario,
    childScenario: childScenario ?? request.childScenario,
  };
};

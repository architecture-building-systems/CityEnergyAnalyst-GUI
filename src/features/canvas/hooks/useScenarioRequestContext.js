import { useMemo } from 'react';

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

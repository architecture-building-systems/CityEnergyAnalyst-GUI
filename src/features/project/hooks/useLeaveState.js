import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useMapStore } from 'features/map/stores/mapStore';
import { useProjectStore } from 'features/project/stores/projectStore';

/**
 * Stop inspecting a pathway state: back to the scenario's own data and map geometry.
 *
 * The one way out, shared by the exit button, deselecting the pathway on the timeline,
 * and clearing the inspected state's inputs (which deletes its folder).
 */
export const useLeaveState = () => {
  const queryClient = useQueryClient();
  const clearChildScenario = useProjectStore((s) => s.clearChildScenario);
  const beginStateZoneOverrideRequest = useMapStore(
    (s) => s.beginStateZoneOverrideRequest,
  );
  const setStateZoneOverride = useMapStore((s) => s.setStateZoneOverride);

  return useCallback(() => {
    clearChildScenario();
    // Bump ownership first so an in-flight state geometry fetch can't re-apply it.
    beginStateZoneOverrideRequest();
    setStateZoneOverride(null);
    queryClient.invalidateQueries();
  }, [
    clearChildScenario,
    beginStateZoneOverrideRequest,
    setStateZoneOverride,
    queryClient,
  ]);
};

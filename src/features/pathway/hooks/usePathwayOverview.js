/**
 * React Query wrapper around `fetchPathwayOverview()`.
 *
 * Single source of truth for "which pathways exist for the active
 * scenario, and which are fully baked". Two consumers today:
 *   - `OverviewCard`'s pathway viewer in the main CEA viewport.
 *   - `NavigatorCard`'s Pathway View toggle in the Canvas Builder.
 *
 * Keyed by the active scenario so a scenario switch refetches; gated
 * by `enabled` so we don't hit the endpoint before a scenario is
 * selected. The pathway endpoints themselves are scenario-scoped via
 * the dashboard's active config — passing `scenario` here is what
 * forces the cache key to flip.
 */
import { useQuery } from '@tanstack/react-query';

import { useProjectStore } from 'features/project/stores/projectStore';

import { fetchPathwayOverview } from '../api';

const STALE_MS = 30_000;

export function usePathwayOverview({ enabled = true } = {}) {
  const scenario = useProjectStore((s) => s.scenario);
  return useQuery({
    queryKey: ['pathways', 'overview', scenario],
    queryFn: fetchPathwayOverview,
    enabled: enabled && !!scenario,
    staleTime: STALE_MS,
  });
}

/**
 * Boolean derivative: does the active scenario have at least one
 * fully-baked pathway? Mirrors the predicate `OverviewCard` uses to
 * decide whether to render the pathway-viewer row, so the Canvas
 * Builder's Pathway View toggle gates on the same data.
 */
export function useHasBakedPathway() {
  const { data } = usePathwayOverview();
  const pathways = data?.pathways ?? [];
  return pathways.some((p) => p.all_baked);
}

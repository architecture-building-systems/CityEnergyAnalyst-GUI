/**
 * React Query wrapper around `fetchPathwayOverview()`.
 *
 * Single source of truth for "which pathways exist for the active
 * scenario, and which phases their states sit in". Two consumers
 * today:
 *   - `OverviewCard`'s pathway viewer in the main CEA viewport
 *     (gates on ``all_baked`` — pathways with every state in a
 *     usable phase, ready to explore).
 *   - `PathwayCompareSelect` in the Canvas Builder (gates on
 *     ``all_simulated`` — pathways whose every state has run
 *     simulations, so per-column data is available).
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
 * pathway whose every state has been simulated? Drives the visibility
 * of the Canvas Builder's Pathway picker — picking a non-simulated
 * pathway would land the user in pathway-single / pathway-multi
 * columns with missing emission / demand outputs and a useless
 * comparison.
 */
export function useHasSimulatedPathway() {
  const { data } = usePathwayOverview();
  const pathways = data?.pathways ?? [];
  return pathways.some((p) => p.all_simulated);
}

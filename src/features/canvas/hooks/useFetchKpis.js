/**
 * React Query wrappers around `GET /api/kpis/`.
 *
 * Two hooks:
 *
 * - `useFetchKpis(project, scenario, feature, whatif?)` fetches every
 *   KPI in one feature for one scenario. Returns the standard React
 *   Query shape; data is the raw endpoint response
 *   `{ kpis: [...], metadata: {...} }`.
 *
 * - `useKpiCacheInvalidator()` mounts once at app boot and
 *   invalidates the entire `['kpis']` query subtree whenever a CEA
 *   tool finishes (the dashboard already emits
 *   `cea-worker-success`). With `staleTime: 0` on the fetch hook,
 *   the next render after a successful tool run pulls fresh values
 *   automatically.
 *
 * Cache key shape is intentional:
 *   ['kpis', project, scenario, feature, whatif ?? null]
 * — `null` (not `undefined`) so the cache distinguishes "no
 * what-if requested" from a what-if that hasn't loaded yet.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from 'lib/api/axios';
import socket, { waitForConnection } from 'lib/socket';

const KPIS_QUERY_ROOT = 'kpis';

const kpisQueryKey = (project, scenario, feature, whatif) => [
  KPIS_QUERY_ROOT,
  project,
  scenario,
  feature,
  whatif ?? null,
];

/**
 * Fetch every KPI in one feature for one scenario.
 *
 * `staleTime: 0` so a tool re-run (which triggers
 * `useKpiCacheInvalidator` below) immediately re-fetches on the
 * next render. The backend's three-hash cache gate makes the
 * actual network round-trip cheap on cache hits.
 */
export const useFetchKpis = (project, scenario, feature, whatif) =>
  useQuery({
    queryKey: kpisQueryKey(project, scenario, feature, whatif),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/kpis/', {
        params: {
          project,
          scenario,
          feature,
          // `undefined` strips the param from the URL — the
          // backend treats it as "no what-if requested".
          whatif: whatif || undefined,
        },
      });
      return data;
    },
    enabled: !!project && !!scenario && !!feature,
    staleTime: 0,
  });

/**
 * App-level subscriber: invalidates every `['kpis', ...]` query
 * whenever a CEA tool finishes, so any open canvas / ribbon
 * re-fetches without a manual reload.
 *
 * Mount once near the QueryClientProvider (`HomePage.jsx`). The
 * effect handles socket reconnect by registering on every
 * `connect` event, mirroring the pattern in `StatusBar.jsx`.
 */
export const useKpiCacheInvalidator = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      // Drop everything under the `kpis` root; React Query
      // re-fetches on next render of any consumer.
      queryClient.invalidateQueries({ queryKey: [KPIS_QUERY_ROOT] });
    };

    // `waitForConnection` ensures we attach after the socket has
    // actually connected — registering against a disconnected
    // socket silently no-ops on reconnect otherwise.
    let cleanup = () => {};
    waitForConnection(() => {
      socket.on('cea-worker-success', handler);
      cleanup = () => socket.off('cea-worker-success', handler);
    });
    return () => cleanup();
  }, [queryClient]);
};

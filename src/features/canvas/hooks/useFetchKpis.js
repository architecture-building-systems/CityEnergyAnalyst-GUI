/**
 * React Query wrappers around `GET /kpis/...`.
 *
 * Four hooks:
 *
 * - `useFetchKpiValue({ project, scenario, childScenario?, kpiId, locatorArgs?, whatif? })`
 *   fetches a single KPI value with optional per-card
 *   ``locatorArgs`` override. Used by canvas KPI cards and the
 *   OverviewCard ribbon's compact tiles. The query key includes
 *   ``locatorArgs`` so two cards with different overrides cache
 *   separately.
 *
 * - `useFetchKpiParameters({ project, scenario, childScenario?, kpiId })` returns
 *   the choice lists for a KPI's user-configurable parameters
 *   (drives the canvas picker's step-2 form).
 *
 * - `useFetchKpiRegistry()` fetches the flat KPI catalogue
 *   (metadata only). Long stale time — registry contents are
 *   yml-baked.
 *
 * - `useKpiCacheInvalidator()` mounts once at app boot and drops
 *   the entire `['kpis']` query subtree whenever a CEA tool
 *   finishes (`cea-worker-success` socket event), so the next
 *   render of any consumer pulls fresh values automatically.
 *
 * Cache key shape uses ``null`` (not ``undefined``) for absent
 * fields so React Query distinguishes "no override requested"
 * from "override not yet known".
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getScenarioClient } from 'lib/api/axios';
import { childScenarioToken, scenarioHeaders } from 'lib/api/scenarioContext';
import { getSocket, waitForConnection } from 'lib/socket';

const KPIS_QUERY_ROOT = 'kpis';

// Stable JSON-stringify helper: undefined / null / empty-object
// all collapse to ``null`` so React Query treats them as the same
// cache key. Otherwise ``{}`` and ``undefined`` would land in
// different slots and pay duplicate fetches.
const _argsKey = (locatorArgs) => {
  if (!locatorArgs) return null;
  const keys = Object.keys(locatorArgs);
  if (keys.length === 0) return null;
  // Sorted keys so {a:1,b:2} and {b:2,a:1} collapse to one key.
  const sorted = {};
  for (const k of keys.sort()) sorted[k] = locatorArgs[k];
  return JSON.stringify(sorted);
};

// `scenario` is a bare scenario name; a pathway state is addressed by its parent's name plus
// `childScenario` (`{ pathway_name, year }`), never by the state's folder path.
export const useFetchKpiValue = ({
  project,
  scenario,
  childScenario = null,
  kpiId,
  locatorArgs = null,
  whatif,
}) => {
  const argsKey = _argsKey(locatorArgs);
  return useQuery({
    queryKey: [
      KPIS_QUERY_ROOT,
      'value',
      project,
      scenario,
      childScenarioToken(childScenario),
      kpiId,
      argsKey,
      whatif ?? null,
    ],
    queryFn: async () => {
      const { data } = await getScenarioClient().get(`/kpis/${kpiId}/value`, {
        headers: scenarioHeaders({
          project,
          scenarioName: scenario,
          childScenario,
        }),
        params: {
          locator_args: argsKey || undefined,
          whatif: whatif || undefined,
        },
      });
      return data;
    },
    enabled: !!project && !!scenario && !!kpiId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};

// Fetch the parameter spec for a KPI. ``args`` carries the
// user's current draft of parameter values; the backend forwards
// it to dependent generators (e.g. ``phases_for_plan`` filters
// by the picked ``plan_name``). The query key includes the args
// so distinct draft states cache separately and the picker
// re-fetches automatically when the user changes a dependency.
export const useFetchKpiParameters = ({
  project,
  scenario,
  childScenario = null,
  kpiId,
  args = null,
}) => {
  const argsKey = _argsKey(args);
  return useQuery({
    queryKey: [
      KPIS_QUERY_ROOT,
      'parameters',
      project,
      scenario,
      childScenarioToken(childScenario),
      kpiId,
      argsKey,
    ],
    queryFn: async () => {
      const { data } = await getScenarioClient().get(
        `/kpis/${kpiId}/parameters`,
        {
          headers: scenarioHeaders({
            project,
            scenarioName: scenario,
            childScenario,
          }),
          params: {
            args: argsKey || undefined,
          },
        },
      );
      return data;
    },
    enabled: !!project && !!scenario && !!kpiId,
    staleTime: 30_000,
  });
};

export const useFetchKpiRegistry = () =>
  useQuery({
    queryKey: ['kpi-registry'],
    queryFn: async () => {
      const { data } = await getScenarioClient().get('/kpis/registry');
      return data;
    },
    staleTime: 60 * 60_000, // 1h
  });

export const useKpiCacheInvalidator = () => {
  const queryClient = useQueryClient();
  const socket = getSocket();

  useEffect(() => {
    const handler = () => {
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
  }, [queryClient, socket]);
};

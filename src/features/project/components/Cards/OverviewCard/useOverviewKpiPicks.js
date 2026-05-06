/**
 * Per-(project, scenario) KPI picks for the OverviewCard ribbon.
 *
 *   const [picks, setPicks] = useOverviewKpiPicks(project, scenario);
 *
 * Persists in `localStorage` under
 * ``cea:overview-kpi-picks:<project>:<scenario>`` so each project /
 * scenario carries its own pinned KPIs, and switching scenarios
 * doesn't leak picks across them. Falls back to ``DEFAULT_KPI_IDS``
 * (GFA + EUI) when nothing's stored — every project shows a
 * useful ribbon out of the box without prompting the user to pick
 * anything.
 *
 * Cap: ``MAX_KPI_PICKS`` (6) — enforced by the picker, not here.
 * The hook just stores whatever array the caller passes.
 */

import { useCallback, useEffect, useState } from 'react';

export const DEFAULT_KPI_IDS = [
  'architecture.total_gfa_m2',
  'demand.eui_kwh_m2',
];

// Cap on the number of KPI tiles the ribbon can show. Keeps the
// expanded ribbon footprint bounded — at ~130 px per card and a
// 2-col grid, six picks fit in three rows (~410 px), which the
// OverviewCard panel comfortably accommodates without crowding
// out the pathway timeline below.
export const MAX_KPI_PICKS = 6;

const storageKey = (project, scenario) =>
  `cea:overview-kpi-picks:${project ?? ''}:${scenario ?? ''}`;

const safeRead = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((s) => typeof s === 'string');
  } catch {
    // Quota / parse / private-mode failure — caller falls back
    // to the in-memory defaults; storage just isn't available
    // this session.
    return null;
  }
};

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Same defensive posture as `safeRead`. The in-memory state
    // still updates so the UI reflects the change for this
    // session.
  }
};

export const useOverviewKpiPicks = (project, scenario) => {
  // Lazy initialiser reads localStorage exactly once per
  // (project, scenario) tuple. The effect below resyncs when
  // the tuple changes (e.g. user opens a different scenario).
  const [picks, setPicksState] = useState(() => {
    if (!project || !scenario) return DEFAULT_KPI_IDS;
    return safeRead(storageKey(project, scenario)) ?? DEFAULT_KPI_IDS;
  });

  useEffect(() => {
    if (!project || !scenario) {
      setPicksState(DEFAULT_KPI_IDS);
      return;
    }
    const stored = safeRead(storageKey(project, scenario));
    setPicksState(stored ?? DEFAULT_KPI_IDS);
  }, [project, scenario]);

  const setPicks = useCallback(
    (next) => {
      const arr = Array.isArray(next) ? next.slice(0, MAX_KPI_PICKS) : [];
      setPicksState(arr);
      if (project && scenario) safeWrite(storageKey(project, scenario), arr);
    },
    [project, scenario],
  );

  return [picks, setPicks];
};

/**
 * Auto-resume the most recently opened canvas on mount, and reset
 * the editor when the active project/scenario changes.
 *
 * Each `(project, scenario)` pair gets a `localStorage` key holding
 * the name of the last canvas the user had open. On every CanvasPage
 * mount — and on every project/scenario switch while the page is
 * still open — we:
 *
 *   1. Reset the canvas store to its empty state. Canvases live
 *      under `<scenario>/outputs/canvas/<name>/`, so a canvas
 *      from the previous scenario must not leak into the new one
 *      (the in-memory `canvasName`, `sharedCards` etc. are scoped
 *      to a single scenario folder).
 *   2. Read the localStorage key. If a last-canvas name is
 *      recorded for the new scenario, fetch + apply it through
 *      the same path the dashboard switcher uses. If the recorded
 *      canvas no longer exists on disk, the localStorage entry
 *      is pruned so we don't keep retrying a 404.
 *
 * If the user creates / opens a canvas in the new scenario while
 * the resume fetch is still in flight, we don't clobber their
 * choice — the post-fetch apply checks `canvasName` again before
 * overriding.
 *
 * Persistence is handled by a sibling effect that watches
 * `canvasName` and writes through.
 */

import { useEffect } from 'react';

import { useProjectStore } from 'features/project/stores/projectStore';

import { readSavedCanvas } from '../api/canvas';
import {
  useCanvasStore,
  MAP_ANCHOR_W,
  MAP_ANCHOR_H,
} from '../stores/canvasStore';
import { deserializeCanvas } from '../utils/canvasSerialize';

const KEY_PREFIX = 'cea:canvas:lastSaved';

export const lastCanvasStorageKey = (project, scenario) =>
  `${KEY_PREFIX}:${project}:${scenario}`;

// Empty-canvas slice. Reused on every scenario switch so the
// editor lands clean before the resume fetch runs. Mirrors the
// fields canvasStore writes when starting fresh — anything not
// listed (navigator toggles like `mapsLinked`, `fixLayout`,
// `enableEdit`) is treated as a user pref that survives the
// scenario switch.
const EMPTY_CANVAS_STATE = {
  view: 'launch',
  columns: [],
  parentScenario: null,
  launchCards: [],
  columnCards: {},
  comparisonSetup: null,
  canvasName: null,
  mapPos: { x: 0, y: 0, w: MAP_ANCHOR_W, h: MAP_ANCHOR_H },
  pathwayTimelinePlotConfig: null,
};

export function useResumeLastCanvas() {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);
  const applyLoadedCanvas = useCanvasStore((s) => s.applyLoadedCanvas);

  useEffect(() => {
    if (!project || !scenario) return undefined;
    const key = lastCanvasStorageKey(project, scenario);

    // Reset on every mount and every (project, scenario) change.
    // Canvases are scenario-scoped, so the previous slice must not
    // leak into the new one. `applyLoadedCanvas` bumps
    // `loadVersion` so the autosave hook resyncs silently rather
    // than flushing the empty state back to the previous folder.
    applyLoadedCanvas(EMPTY_CANVAS_STATE);

    const lastName = localStorage.getItem(key);
    if (!lastName) return undefined;

    // Cancel-on-cleanup pattern handles both real scenario
    // switches and React 19 Strict Mode's mount→cleanup→remount
    // dance: the cleanup flips `cancelled`, the remount kicks off
    // a fresh fetch with its own `cancelled` closure.
    let cancelled = false;
    (async () => {
      try {
        const state = await readSavedCanvas({
          project,
          scenario,
          name: lastName,
        });
        if (cancelled) return;
        // The user may have created or opened something in the
        // new scenario while we were waiting on the network.
        // Don't clobber their choice.
        if (useCanvasStore.getState().canvasName) return;
        applyLoadedCanvas(deserializeCanvas(state));
      } catch (err) {
        if (err?.response?.status === 404) {
          localStorage.removeItem(key);
        } else {
          // eslint-disable-next-line no-console
          console.error('Resume last canvas failed', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [project, scenario, applyLoadedCanvas]);
}

/**
 * Write a canvas name as the resume target for `(project,
 * scenario)`. Called from every flow that opens or creates a
 * canvas (NavigatorCard's handlers + the auto-open after import).
 *
 * Replaces a sibling `useEffect` that mirrored `canvasName` to
 * localStorage automatically — that effect ran with the
 * stale-render `canvasName` whenever the scenario flipped, which
 * leaked the previous scenario's canvas name into the new
 * scenario's storage key. Each origin now writes with the
 * `(project, scenario)` it actually intended.
 */
export const writeLastCanvas = (project, scenario, name) => {
  if (!project || !scenario || !name) return;
  try {
    localStorage.setItem(lastCanvasStorageKey(project, scenario), name);
  } catch (_err) {
    // localStorage can throw in privacy modes; ignore.
  }
};

/**
 * Clear the resume target for `(project, scenario)`. Called when
 * the user deletes the canvas that's currently open (NavigatorCard
 * handles that) so the next visit doesn't 404 trying to resume a
 * canvas that no longer exists.
 */
export const clearLastCanvas = (project, scenario) => {
  if (!project || !scenario) return;
  try {
    localStorage.removeItem(lastCanvasStorageKey(project, scenario));
  } catch (_err) {
    // see `writeLastCanvas`.
  }
};

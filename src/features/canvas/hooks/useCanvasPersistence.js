/**
 * Autosave hook for the Canvas Builder.
 *
 * Subscribes to the canvas store and flushes a serialised snapshot
 * to the backend's `/api/canvas/{name}` endpoint on a debounced
 * cadence. Every edit lands in the saved folder directly — there
 * is no temp / draft staging area.
 *
 * Mounted once at the top of `CanvasPage`. Idempotent — no setup is
 * shared across multiple mount sites.
 *
 * Activation rules:
 *   - No project / scenario selected → do nothing.
 *   - No canvas open (`canvasName == null`)  → do nothing. The
 *     navigator's New-canvas modal calls `POST /api/canvas/`
 *     itself before populating `canvasName`, so the folder always
 *     exists by the time the autosave hook starts targeting it.
 *   - Otherwise: every persistable change fires a 300 ms debounce
 *     and posts a sparse PUT to the saved folder.
 */

import { useEffect, useRef } from 'react';

import { useProjectStore } from 'features/project/stores/projectStore';

import { useCanvasStore } from '../stores/canvasStore';
import { updateSavedCanvas } from '../api/canvas';
import { serializeCanvas } from '../utils/canvasSerialize';

const DEBOUNCE_MS = 300;

// Only changes to these slices should trigger an autosave flush.
// `canvasName` is deliberately *not* in here: it changes during
// load / open / start-over transitions, not from user edits to the
// canvas content itself, and including it would re-flush the same
// content the moment a load finishes. Other no-edit transitions
// (loading a saved canvas, importing a zip) bump `loadVersion` so
// the hook resyncs its baseline silently instead of treating the
// reset as an edit.
// Slices serialised to disk by `serializeCanvas`. Any field that
// round-trips through canvas.yml / layout.yml / feature_card.yml
// must appear here, otherwise the autosave hook won't notice the
// user's change and the new value is lost on the next reload.
const PERSISTABLE_SELECTOR = (state) => ({
  view: state.view,
  parentScenario: state.parentScenario,
  columns: state.columns,
  launchCards: state.launchCards,
  sharedCards: state.sharedCards,
  mapsLinked: state.mapsLinked,
  fixLayout: state.fixLayout,
  mapPos: state.mapPos,
  comparisonSetup: state.comparisonSetup,
});

const shallowEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
};

export function useCanvasPersistence() {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  // Refs for the debounce machinery. Using refs (not state) so a
  // pending timer / in-flight request doesn't trigger re-renders.
  const timerRef = useRef(null);
  const lastSnapshotRef = useRef(
    PERSISTABLE_SELECTOR(useCanvasStore.getState()),
  );
  const lastLoadVersionRef = useRef(useCanvasStore.getState().loadVersion);
  const inFlightRef = useRef(false);
  // Timer for reverting `autosaveStatus` from 'saved' back to
  // 'idle' after the brief confirmation flash. Held in a ref so a
  // rapid succession of saves cancels the previous countdown.
  const savedFlashTimerRef = useRef(null);

  useEffect(() => {
    const flush = async () => {
      timerRef.current = null;
      if (inFlightRef.current) {
        // Re-arm and let the in-flight call finish first; whichever
        // change arrives next will schedule the next flush.
        return;
      }
      const state = useCanvasStore.getState();
      const name = state.canvasName;
      if (!project || !scenario || !name) return;

      inFlightRef.current = true;
      // Pulse the indicator: 'saving' goes up the moment the PUT
      // starts so the user sees the dot whether the request takes
      // 50 ms or 500 ms. Cancel any pending saved → idle revert
      // from a previous save so a rapid edit doesn't flash 'saved'
      // *during* the next save.
      if (savedFlashTimerRef.current) {
        clearTimeout(savedFlashTimerRef.current);
        savedFlashTimerRef.current = null;
      }
      useCanvasStore.getState().setAutosaveStatus('saving');
      try {
        await updateSavedCanvas({
          project,
          scenario,
          name,
          payload: serializeCanvas(state),
        });
        useCanvasStore.getState().setAutosaveStatus('saved');
        // Brief confirmation flash; then back to 'idle' so the
        // indicator disappears between saves.
        savedFlashTimerRef.current = setTimeout(() => {
          savedFlashTimerRef.current = null;
          useCanvasStore.getState().setAutosaveStatus('idle');
        }, 1500);
      } catch (err) {
        useCanvasStore.getState().setAutosaveStatus('idle');
        // Autosave is best-effort — surface the error in the
        // console but don't disrupt the user's flow.
        // eslint-disable-next-line no-console
        console.error('Canvas autosave failed', err);
      } finally {
        inFlightRef.current = false;
      }
    };

    const unsubscribe = useCanvasStore.subscribe((state) => {
      // External load (Open / Resume / Import / Create) bumps
      // `loadVersion`. Resync the diff baseline silently so the
      // just-loaded state isn't immediately re-flushed back to the
      // backend as a "change". Cancel any pending edit-flush from
      // before the load — those edits are gone now.
      if (state.loadVersion !== lastLoadVersionRef.current) {
        lastLoadVersionRef.current = state.loadVersion;
        lastSnapshotRef.current = PERSISTABLE_SELECTOR(state);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      const snapshot = PERSISTABLE_SELECTOR(state);
      if (shallowEqual(snapshot, lastSnapshotRef.current)) return;
      lastSnapshotRef.current = snapshot;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (savedFlashTimerRef.current) {
        clearTimeout(savedFlashTimerRef.current);
        savedFlashTimerRef.current = null;
      }
      unsubscribe();
    };
  }, [project, scenario]);
}

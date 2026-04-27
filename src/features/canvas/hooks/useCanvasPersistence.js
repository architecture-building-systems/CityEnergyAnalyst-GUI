/**
 * Autosave hook for the Canvas Builder.
 *
 * Subscribes to the canvas store and flushes a serialised snapshot
 * to the backend's `/api/canvas/temp/<uuid>` endpoint on a debounced
 * cadence. The first flush after a clean state allocates the temp
 * folder via `POST /api/canvas/temp` (optionally seeded `from` a
 * saved canvas the user is editing); subsequent flushes target the
 * same uuid until the canvas is saved or discarded.
 *
 * Mounted once at the top of `CanvasPage`. Idempotent — no setup is
 * shared across multiple mount sites.
 *
 * Activation rules:
 *   - `autoSave` toggle off → do nothing.
 *   - No project / scenario selected → do nothing.
 *   - Otherwise: every persistable change fires a 300 ms debounce.
 *
 * Launch view cards now live in the store (`launchCards`) so a
 * draft canvas in the launch view persists too — the user can build
 * cards before deciding which comparison mode to enter and the
 * autosave hook captures them just like any other state.
 */

import { useEffect, useRef } from 'react';

import { useProjectStore } from 'features/project/stores/projectStore';

import { useCanvasStore } from '../stores/canvasStore';
import { createTempCanvas, updateTempCanvas } from '../api/canvas';
import { serializeCanvas } from '../utils/canvasSerialize';

const DEBOUNCE_MS = 300;

// Only changes to these slices should trigger an autosave flush.
// Toggles like `autoSave` itself, and ephemeral session state
// (`lastSavedAt`, `tempUuid`) don't count.
const PERSISTABLE_SELECTOR = (state) => ({
  view: state.view,
  parentScenario: state.parentScenario,
  columns: state.columns,
  launchCards: state.launchCards,
  sharedCards: state.sharedCards,
  columnCards: state.columnCards,
  mapsLinked: state.mapsLinked,
  fixLayout: state.fixLayout,
  canvasName: state.canvasName,
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
  const lastSnapshotRef = useRef(PERSISTABLE_SELECTOR(useCanvasStore.getState()));
  const lastLoadVersionRef = useRef(useCanvasStore.getState().loadVersion);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const flush = async () => {
      timerRef.current = null;
      if (inFlightRef.current) {
        // Re-arm and let the in-flight call finish first; whichever
        // change arrives next will schedule the next flush.
        return;
      }
      const state = useCanvasStore.getState();
      if (!state.autoSave || !project || !scenario) return;

      inFlightRef.current = true;
      try {
        let uuid = state.tempUuid;
        if (!uuid) {
          // First persistable edit on a clean state — allocate a
          // server-side uuid. Seed from `canvasName` when present
          // so the temp's canvas.yml records its parent saved
          // canvas (used by Save to overwrite the right folder).
          const result = await createTempCanvas({
            project,
            scenario,
            fromName: state.canvasName ?? null,
          });
          uuid = result.uuid;
          useCanvasStore.getState().setTempUuid(uuid);
        }
        await updateTempCanvas({
          project,
          scenario,
          uuid,
          payload: serializeCanvas(state),
        });
        useCanvasStore.getState().setLastSavedAt(Date.now());
      } catch (err) {
        // Autosave is best-effort — surface the error in the
        // console but don't disrupt the user's flow. Phase 4 will
        // wire a "couldn't save" badge in the navigator.
        console.error('Canvas autosave failed', err);
      } finally {
        inFlightRef.current = false;
      }
    };

    const unsubscribe = useCanvasStore.subscribe((state) => {
      // External load (Open / Resume / Import) bumps `loadVersion`.
      // Resync the diff baseline silently so the just-loaded state
      // isn't immediately re-flushed back to the backend as a
      // "change". Cancel any pending edit-flush from before the
      // load — those edits are gone now.
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
      unsubscribe();
    };
  }, [project, scenario]);
}

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

// Only changes to these slices should trigger an autosave flush
// + dirty-flag flip. `canvasName` and `savedAs` are deliberately
// *not* in here even though they live on the same store: they
// change during Save / Load / Create-named-draft transitions, not
// from user edits to the canvas content itself, and including
// them would re-dirty the state immediately after `markSaved`
// resets it (false-positive `dirty: true` right after a successful
// commit). Other no-edit transitions (`createNamedDraft`,
// `startOver`) bump `loadVersion` so the cards-reset resyncs the
// snapshot silently instead of looking like an edit.
const PERSISTABLE_SELECTOR = (state) => ({
  view: state.view,
  parentScenario: state.parentScenario,
  columns: state.columns,
  launchCards: state.launchCards,
  sharedCards: state.sharedCards,
  columnCards: state.columnCards,
  mapsLinked: state.mapsLinked,
  fixLayout: state.fixLayout,
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
          // server-side uuid. Seed from `savedAs` (not
          // `canvasName`): a freshly named draft has a name typed
          // by the user but no folder on disk yet, and 404'ing
          // the temp seed against a non-existent folder would
          // block the autosave. `savedAs` is null until Save
          // commits, exactly the right gate.
          const result = await createTempCanvas({
            project,
            scenario,
            fromName: state.savedAs ?? null,
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

      // Flip the store's `dirty` flag the moment a persistable
      // change is detected — the Save button reads this so it
      // can enable even when `tempUuid` is still null (autoSave
      // off, or an edit made within the debounce window before
      // the first flush has materialised the temp folder).
      if (!state.dirty) {
        useCanvasStore.getState().setDirty(true);
      }

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

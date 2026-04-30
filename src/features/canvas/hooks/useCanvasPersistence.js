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

import {
  canvasPersistableSelector,
  useCanvasStore,
} from '../stores/canvasStore';
import { updateSavedCanvas } from '../api/canvas';
import { serializeCanvas } from '../utils/canvasSerialize';

const DEBOUNCE_MS = 300;
// 'saved' indicator briefly flashes after each successful PUT, then
// fades back to 'idle' so the dot doesn't loiter between edits.
const SAVED_FLASH_MS = 1500;

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
    canvasPersistableSelector(useCanvasStore.getState()),
  );
  const lastLoadVersionRef = useRef(useCanvasStore.getState().loadVersion);
  const lastUndoVersionRef = useRef(useCanvasStore.getState().undoVersion);
  // Snapshot to push onto the undo stack when the next debounced
  // flush fires. Captured once per debounce burst (so a drag-tick
  // sequence becomes a single undo step) and reset after the push.
  const pendingUndoSnapshotRef = useRef(null);
  const inFlightRef = useRef(false);
  // Timer for reverting `autosaveStatus` from 'saved' back to
  // 'idle' after the brief confirmation flash. Held in a ref so a
  // rapid succession of saves cancels the previous countdown.
  const savedFlashTimerRef = useRef(null);

  useEffect(() => {
    // PUT a snapshot to its own canvas folder. Taking `state` as
    // an arg (not reading the live store) lets the load-detection
    // branch save the *pre-load* state before the active state
    // pivots to the new canvas.
    const flushState = async (state) => {
      if (inFlightRef.current) {
        // Re-arm and let the in-flight call finish first; whichever
        // change arrives next will schedule the next flush.
        return;
      }
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
        }, SAVED_FLASH_MS);
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

    // Debounced disk flush. The undo-stack push happens synchronously
    // on first detect (see below) so the Back button enables right
    // away — only the network PUT is deferred here.
    const flushLatest = () => {
      timerRef.current = null;
      // Reset the burst marker so the next edit pushes a fresh
      // pre-edit snapshot.
      pendingUndoSnapshotRef.current = null;
      flushState(useCanvasStore.getState());
    };

    const unsubscribe = useCanvasStore.subscribe((state, prevState) => {
      // External load (Open / Resume / Import / Create) bumps
      // `loadVersion`. Flush any pending edit against `prevState`
      // first so the user's last change still lands in its own
      // canvas folder, then resync the baseline silently.
      if (state.loadVersion !== lastLoadVersionRef.current) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
          flushState(prevState);
        }
        pendingUndoSnapshotRef.current = null;
        lastLoadVersionRef.current = state.loadVersion;
        lastUndoVersionRef.current = state.undoVersion;
        lastSnapshotRef.current = canvasPersistableSelector(state);
        return;
      }

      // Undo applied — flush the new state so disk matches, but
      // don't push it back onto the undo stack (would loop).
      if (state.undoVersion !== lastUndoVersionRef.current) {
        lastUndoVersionRef.current = state.undoVersion;
        lastSnapshotRef.current = canvasPersistableSelector(state);
        pendingUndoSnapshotRef.current = null;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flushLatest, DEBOUNCE_MS);
        return;
      }

      const snapshot = canvasPersistableSelector(state);
      if (shallowEqual(snapshot, lastSnapshotRef.current)) return;
      // First detect of a debounce burst: push the pre-edit
      // snapshot onto the undo stack *now* so the Back button
      // enables synchronously. Subsequent detects in the same
      // burst (drag-tick stream, multi-set action) skip the push
      // — the stack already records the burst's starting point.
      const isFirstDetectInBurst = pendingUndoSnapshotRef.current == null;
      const preEditSnapshot = lastSnapshotRef.current;
      lastSnapshotRef.current = snapshot;
      if (isFirstDetectInBurst) {
        pendingUndoSnapshotRef.current = preEditSnapshot;
        // `pushUndoSnapshot` triggers a recursive subscribe call;
        // by this point `lastSnapshotRef` already matches the
        // current state, so the recursive call short-circuits at
        // the `shallowEqual` guard above.
        useCanvasStore.getState().pushUndoSnapshot(preEditSnapshot);
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flushLatest, DEBOUNCE_MS);
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

/**
 * Auto-resume the most recently saved canvas on mount.
 *
 * Each `(project, scenario)` pair gets a `localStorage` key holding
 * the name of the last canvas that was committed via Save (or
 * loaded from a saved canvas). On every CanvasPage mount we read
 * that key and, if the canvas still exists on disk, fetch + apply
 * it through the same path the dashboard switcher uses.
 *
 * Two safety rails:
 *
 *   - The resume only runs when the store is in its empty state
 *     (`canvasName === null`). If the user already has something
 *     open from earlier in the session — say a fresh draft they
 *     created via the New-canvas modal — we don't clobber it.
 *
 *   - If the recorded canvas no longer exists on disk (deleted
 *     elsewhere, project moved), the localStorage entry is
 *     pruned so we don't keep retrying a 404.
 *
 * Persistence is handled by a sibling effect that watches
 * `savedAs` (the name *committed* on disk, not just the typed
 * draft name) and writes through. Drafts that haven't been saved
 * yet don't pollute the resume target.
 */

import { useEffect, useRef } from 'react';

import { useProjectStore } from 'features/project/stores/projectStore';

import { readSavedCanvas } from '../api/canvas';
import { useCanvasStore } from '../stores/canvasStore';
import { deserializeCanvas } from '../utils/canvasSerialize';

const KEY_PREFIX = 'cea:canvas:lastSaved';

const storageKey = (project, scenario) =>
  `${KEY_PREFIX}:${project}:${scenario}`;

export function useResumeLastCanvas() {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);
  const savedAs = useCanvasStore((s) => s.savedAs);
  const applyLoadedCanvas = useCanvasStore((s) => s.applyLoadedCanvas);

  // Track whether we've already attempted resume for the current
  // `(project, scenario)` pair, so a re-render of `CanvasPage`
  // (e.g. drawer open/close changing layout) doesn't kick off a
  // second fetch.
  const attemptedKeyRef = useRef('');

  useEffect(() => {
    if (!project || !scenario) return;
    const key = storageKey(project, scenario);
    if (attemptedKeyRef.current === key) return;
    attemptedKeyRef.current = key;

    // Read the *current* canvasName imperatively so we don't pin
    // this effect to its dependency. If the user has already
    // opened a canvas this session, leave it alone.
    if (useCanvasStore.getState().canvasName) return;

    const lastName = localStorage.getItem(key);
    if (!lastName) return;

    let cancelled = false;
    (async () => {
      try {
        const state = await readSavedCanvas({
          project,
          scenario,
          name: lastName,
        });
        if (cancelled) return;
        // Re-check: the user may have created or opened something
        // while we were waiting on the network.
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

  // Mirror `savedAs` into localStorage on every change. Watching
  // `savedAs` (not `canvasName`) keeps untitled drafts out of the
  // resume target; only canvases the user has actually committed
  // are remembered.
  useEffect(() => {
    if (!project || !scenario || !savedAs) return;
    localStorage.setItem(storageKey(project, scenario), savedAs);
  }, [project, scenario, savedAs]);
}

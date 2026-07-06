/**
 * Canvas Builder backend client.
 *
 * Thin axios wrappers around the `/api/canvas/*` endpoints (router
 * lives in `cea/interfaces/dashboard/api/canvas.py`). Each call
 * carries the active scenario via `X-CEA-*` request headers
 * (preferred by the backend's `CEAScenario` dependency over query
 * params, and avoids leaking absolute filesystem paths into URLs).
 *
 * No draft / temp staging area: every edit posts straight to the
 * saved canvas folder via `updateSavedCanvas`. The expensive
 * plot-data capture pass runs server-side inside the `/export`
 * endpoint when the user clicks Share.
 */

import { apiClient, getScenarioClient } from 'lib/api/axios';
import { scenarioHeaders } from 'lib/api/scenarioContext';

const BASE = '/api/canvas';

// ── Saved canvases ─────────────────────────────────────────────
// Reads (list/read) go through getScenarioClient() so they also work
// against the read-only public demo API in demo mode; every write below
// stays on apiClient - demo mode has no write routes and hides these
// affordances in the UI (see ProjectOverlay/CanvasPage demo gating).

export const listSavedCanvases = async ({ project, scenario }) => {
  const { data } = await getScenarioClient().get(`${BASE}/`, {
    headers: scenarioHeaders({ project, scenarioName: scenario }),
  });
  return data; // string[]
};

export const readSavedCanvas = async ({ project, scenario, name }) => {
  const { data } = await getScenarioClient().get(
    `${BASE}/${encodeURIComponent(name)}`,
    { headers: scenarioHeaders({ project, scenarioName: scenario }) },
  );
  return data; // { canvas, layout, feature_card }
};

/**
 * Create a fresh, empty saved canvas under `name`. The backend
 * sanitises the name and returns the cleaned form. 409 if the
 * sanitised name already exists; 400 on illegal name.
 */
export const createCanvas = async ({ project, scenario, name }) => {
  const { data } = await apiClient.post(
    `${BASE}/`,
    { name },
    { headers: scenarioHeaders({ project, scenarioName: scenario }) },
  );
  return data; // { name }
};

/**
 * Sparse autosave — pass any subset of `{ canvas, layout, feature_card }`.
 * Slices not present in the body are left untouched on disk.
 */
export const updateSavedCanvas = async ({
  project,
  scenario,
  name,
  payload,
}) => {
  await apiClient.put(`${BASE}/${encodeURIComponent(name)}`, payload, {
    headers: scenarioHeaders({ project, scenarioName: scenario }),
  });
};

export const deleteSavedCanvas = async ({ project, scenario, name }) => {
  await apiClient.delete(`${BASE}/${encodeURIComponent(name)}`, {
    headers: scenarioHeaders({ project, scenarioName: scenario }),
  });
};

/**
 * Copy a saved canvas to a new folder. Pass ``as`` to override the
 * default target name (the backend auto-picks
 * ``"<name> (copy)"`` / ``"<name> (copy 2)"`` / … when omitted).
 * Returns ``{ name }`` — the cleaned target name committed on disk.
 */
export const duplicateCanvas = async ({ project, scenario, name, as }) => {
  const body = as ? { name: as } : {};
  const { data } = await apiClient.post(
    `${BASE}/${encodeURIComponent(name)}/duplicate`,
    body,
    { headers: scenarioHeaders({ project, scenarioName: scenario }) },
  );
  return data;
};

// ── Zip export / import ────────────────────────────────────────

/**
 * Download a saved canvas as a zip. The backend captures every plot
 * card to HTML before zipping, so this call can take a moment (it
 * re-renders every plot). Returns a Blob the caller can pipe through
 * `URL.createObjectURL` to trigger a browser download — the
 * apiClient layer adds auth, so a plain `<a href>` link wouldn't
 * work for protected backends.
 */
export const exportCanvasZip = async ({ project, scenario, name }) => {
  const { data } = await apiClient.get(
    `${BASE}/${encodeURIComponent(name)}/export`,
    {
      headers: scenarioHeaders({ project, scenarioName: scenario }),
      responseType: 'blob',
    },
  );
  return data;
};

/**
 * Upload a previously-exported canvas zip. Returns `{ name }` on
 * success — the cleaned name the backend committed under, which
 * may differ from the zip's top-level folder if it was sanitised
 * (or if the caller passed `as` to override it).
 *
 * The `as` parameter is the import-as-rename escape hatch: when
 * the original zip name conflicts with an existing saved canvas
 * the backend returns 409, the UI prompts for a fresh name, and
 * we retry the upload with `as` set.
 */
export const importCanvasZip = async ({ project, scenario, file, as }) => {
  const form = new FormData();
  form.append('file', file);
  const params = as ? { as } : {};
  const { data } = await apiClient.post(`${BASE}/import`, form, {
    params,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...scenarioHeaders({ project, scenarioName: scenario }),
    },
  });
  return data;
};

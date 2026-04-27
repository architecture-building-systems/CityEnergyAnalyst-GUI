/**
 * Canvas Builder backend client.
 *
 * Thin axios wrappers around the `/api/canvas/*` endpoints (router
 * lives in `cea/interfaces/dashboard/api/canvas.py`). Each call
 * carries the standard `{ project, scenario }` query params — same
 * convention every other report-style endpoint uses.
 *
 * No draft / temp staging area: every edit posts straight to the
 * saved canvas folder via `updateSavedCanvas`. The expensive
 * plot-data capture pass runs server-side inside the `/export`
 * endpoint when the user clicks Share.
 */

import { apiClient } from 'lib/api/axios';

const BASE = '/api/canvas';

// ── Saved canvases ─────────────────────────────────────────────

export const listSavedCanvases = async ({ project, scenario }) => {
  const { data } = await apiClient.get(`${BASE}/`, {
    params: { project, scenario },
  });
  return data; // string[]
};

export const readSavedCanvas = async ({ project, scenario, name }) => {
  const { data } = await apiClient.get(`${BASE}/${encodeURIComponent(name)}`, {
    params: { project, scenario },
  });
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
    { params: { project, scenario } },
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
    params: { project, scenario },
  });
};

export const deleteSavedCanvas = async ({ project, scenario, name }) => {
  await apiClient.delete(`${BASE}/${encodeURIComponent(name)}`, {
    params: { project, scenario },
  });
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
      params: { project, scenario },
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
  const params = { project, scenario };
  if (as) params.as = as;
  const { data } = await apiClient.post(`${BASE}/import`, form, {
    params,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

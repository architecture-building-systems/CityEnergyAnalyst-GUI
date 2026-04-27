/**
 * Canvas Builder backend client.
 *
 * Thin axios wrappers around the `/api/canvas/*` endpoints (router
 * lives in `cea/interfaces/dashboard/api/canvas.py`). Each call
 * carries the standard `{ project, scenario }` query params — same
 * convention every other report-style endpoint uses.
 *
 * The autosave path uses `createTemp` (one-shot, on first edit) and
 * `updateTemp` (debounced, on every subsequent change). The Save
 * click promotes via `saveTemp`. Discard hits `deleteTemp`.
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
  const { data } = await apiClient.get(
    `${BASE}/${encodeURIComponent(name)}`,
    { params: { project, scenario } },
  );
  return data; // { canvas, layout, feature_card }
};

export const deleteSavedCanvas = async ({ project, scenario, name }) => {
  await apiClient.delete(`${BASE}/${encodeURIComponent(name)}`, {
    params: { project, scenario },
  });
};

// ── Temp / draft canvases ──────────────────────────────────────

export const createTempCanvas = async ({ project, scenario, fromName }) => {
  const body = fromName ? { from: fromName } : {};
  const { data } = await apiClient.post(`${BASE}/temp`, body, {
    params: { project, scenario },
  });
  return data; // { uuid }
};

export const readTempCanvas = async ({ project, scenario, uuid }) => {
  const { data } = await apiClient.get(`${BASE}/temp/${uuid}`, {
    params: { project, scenario },
  });
  return data; // { canvas, layout, feature_card }
};

/**
 * Sparse autosave — pass any subset of `{ canvas, layout, feature_card }`.
 * Slices not present in the body are left untouched on disk.
 */
export const updateTempCanvas = async ({
  project,
  scenario,
  uuid,
  payload,
}) => {
  await apiClient.put(`${BASE}/temp/${uuid}`, payload, {
    params: { project, scenario },
  });
};

export const deleteTempCanvas = async ({ project, scenario, uuid }) => {
  await apiClient.delete(`${BASE}/temp/${uuid}`, {
    params: { project, scenario },
  });
};

export const saveTempCanvas = async ({ project, scenario, uuid, name }) => {
  const { data } = await apiClient.post(
    `${BASE}/temp/${uuid}/save`,
    { name },
    { params: { project, scenario } },
  );
  return data; // { name }
};

// ── Zip export / import ────────────────────────────────────────

/**
 * Download a saved canvas as a zip. Returns a Blob the caller can
 * pipe through `URL.createObjectURL` to trigger a browser download
 * — the apiClient layer adds auth, so a plain `<a href>` link
 * wouldn't work for protected backends.
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

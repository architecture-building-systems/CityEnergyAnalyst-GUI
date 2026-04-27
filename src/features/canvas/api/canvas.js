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

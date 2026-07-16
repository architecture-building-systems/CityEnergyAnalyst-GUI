// Client-side persistence for tool config in non-local (stateless) mode.
//
// The non-local CEA backend rebuilds its config from defaults on every
// request and its `save-config` endpoint is a no-op (see
// CEAStatelessConfig in the backend's dependencies.py) - nothing is ever
// persisted server-side. To keep saved parameter values across
// fetches/reloads, we persist them here as a flat `paramName -> value` map,
// scoped per user and shared across all tools/scenarios (mirroring how
// local mode's single `~/cea.config` file behaves).
//
// `scenario` is intentionally never stored: it's contextual, injected per
// active scenario by the backend/form, not a real saved setting.

const STORAGE_KEY_PREFIX = 'cea-tool-config';
const EXCLUDED_PARAM_NAMES = new Set(['scenario']);

const getStorageKey = (userID) =>
  userID ? `${STORAGE_KEY_PREFIX}-${userID}` : STORAGE_KEY_PREFIX;

export const readStoredToolConfig = (userID) => {
  try {
    const raw = localStorage.getItem(getStorageKey(userID));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.error('Error reading stored tool config:', err);
    return {};
  }
};

const writeStoredToolConfig = (userID, config) => {
  try {
    localStorage.setItem(getStorageKey(userID), JSON.stringify(config));
  } catch (err) {
    console.error('Error writing stored tool config:', err);
  }
};

// Shallow-merges `paramValues` into the stored map for this user.
export const mergeStoredToolConfig = (userID, paramValues) => {
  if (!paramValues) return;
  const current = readStoredToolConfig(userID);
  const next = { ...current };
  for (const [name, value] of Object.entries(paramValues)) {
    if (EXCLUDED_PARAM_NAMES.has(name)) continue;
    next[name] = value;
  }
  writeStoredToolConfig(userID, next);
};

// Removes the given parameter names from the stored map (used on Reset).
export const clearStoredToolConfig = (userID, paramNames) => {
  if (!paramNames?.length) return;
  const current = readStoredToolConfig(userID);
  const next = { ...current };
  let changed = false;
  for (const name of paramNames) {
    if (name in next) {
      delete next[name];
      changed = true;
    }
  }
  if (changed) writeStoredToolConfig(userID, next);
};

// Returns every parameter name known to a `/api/tools/{script}` response
// (both flat `parameters` and grouped `categorical_parameters`).
export const getToolParamNames = (data) => {
  if (!data) return [];
  const names = (data.parameters || []).map((p) => p.name);
  const categorical = Object.values(data.categorical_parameters || {}).flat();
  return [...names, ...categorical.map((p) => p.name)];
};

// Pure: returns a shallow copy of a `/api/tools/{script}` response with each
// parameter's `.value` replaced by the stored value, when present.
export const overlayStoredValues = (data, storedMap) => {
  if (!data || !storedMap || Object.keys(storedMap).length === 0) return data;

  const overlayParam = (param) =>
    param.name in storedMap
      ? { ...param, value: storedMap[param.name] }
      : param;

  const parameters = data.parameters?.map(overlayParam);

  const categorical_parameters = data.categorical_parameters
    ? Object.fromEntries(
        Object.entries(data.categorical_parameters).map(
          ([category, params]) => [category, params.map(overlayParam)],
        ),
      )
    : data.categorical_parameters;

  return { ...data, parameters, categorical_parameters };
};

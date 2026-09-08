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

// Returns every parameter name known to a `/tools/{script}` response
// (both flat `parameters` and grouped `categorical_parameters`).
export const getToolParamNames = (data) => {
  if (!data) return [];
  const names = (data.parameters || []).map((p) => p.name);
  const categorical = Object.values(data.categorical_parameters || {}).flat();
  return [...names, ...categorical.map((p) => p.name)];
};

// Choice-backed parameters (backend's ChoiceParameterBase) publish `choices` as an array;
// WeatherPathParameter/DatabasePathParameter publish a dict instead and have nothing here
// to validate against, so their stored value is overlaid as-is, unchanged.
//
// For array-choice parameters, a stored override is only applied when it's still among the
// CURRENT `choices` -- these are scenario-relative (e.g. WhatIfNameMultiChoiceParameter
// scans the active scenario's outputs/data/analysis/), while the stored override is not
// scoped by scenario at all (this module is shared across every scenario for the user, see
// the module comment above). Applying it blindly on a scenario switch would silently
// resurrect a selection the new scenario has no data for -- the exact "not a valid choice"
// bug the backend's own value/choices normalisation (deconstruct_parameters,
// normalize_choice_value in the backend's api/utils.py) fixes server-side. This mirrors
// that fix for the one thing the backend can't see: a client-persisted override arriving
// after its own response was already computed and normalised.
//
// Multi-choice values are filtered to the valid subset (matching the backend's own
// behaviour); a single-choice value that's gone stale is dropped in favour of the server's
// already-normalised `param.value`, rather than re-deriving a fallback here.
const overlayParam = (storedMap) => (param) => {
  if (!(param.name in storedMap)) return param;
  const storedValue = storedMap[param.name];

  if (Array.isArray(param.choices)) {
    if (Array.isArray(param.value)) {
      const values = Array.isArray(storedValue)
        ? storedValue
        : typeof storedValue === 'string'
          ? storedValue
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
          : storedValue == null
            ? []
            : [storedValue];
      return {
        ...param,
        value: values.filter((v) => param.choices.includes(v)),
      };
    }

    if (!param.choices.includes(storedValue)) return param;
  }

  return { ...param, value: storedValue };
};

// Pure: returns a shallow copy of a `/tools/{script}` response with each
// parameter's `.value` replaced by the stored value, when present and still valid.
export const overlayStoredValues = (data, storedMap) => {
  if (!data || !storedMap || Object.keys(storedMap).length === 0) return data;

  const overlay = overlayParam(storedMap);

  const parameters = data.parameters?.map(overlay);

  const categorical_parameters = data.categorical_parameters
    ? Object.fromEntries(
        Object.entries(data.categorical_parameters).map(
          ([category, params]) => [category, params.map(overlay)],
        ),
      )
    : data.categorical_parameters;

  return { ...data, parameters, categorical_parameters };
};

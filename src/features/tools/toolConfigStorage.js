// Client-side persistence for tool config in non-local (stateless) mode.
//
// The non-local CEA backend rebuilds its config from defaults on every
// request and its `save-config` endpoint is a no-op (see
// CEAStatelessConfig in the backend's dependencies.py) - nothing is ever
// persisted server-side. To keep saved parameter values across
// fetches/reloads, we persist them here as `script -> paramName -> value`,
// scoped per user and shared across all scenarios.
//
// Values are kept per tool because a parameter name alone does not identify a
// parameter: the backend's config is keyed by `section:name`, and different
// tools reuse a name for unrelated parameters of different types (e.g.
// `what-if-name` is a multi-select on the plots but free text on LCA Part 1,
// `network-name` likewise between Thermal Network Part 1 and Part 2). A single
// flat map let one tool's saved value land on another tool's field, where the
// form displayed it plausibly and then submitted the wrong type.
//
// `scenario` is intentionally never stored: it's contextual, injected per
// active scenario by the backend/form, not a real saved setting. `context`
// (PlotContextParameter) is the same kind of value: it describes which plot is
// open and what the map shows right now, and is rebuilt every time a plot form
// loads (see plot-tool.jsx) -- a saved one is by definition stale.

// v2: per-tool maps. The unversioned key held the earlier flat map, whose
// entries can't be attributed to a tool, so it is left unread.
const STORAGE_KEY_PREFIX = 'cea-tool-config-v2';
const EXCLUDED_PARAM_NAMES = new Set(['scenario', 'context']);

// A browser `File` (web-mode upload fields hold one) can't be persisted: JSON.stringify turns
// it into `{"uid":"rc-upload-..."}` (only antd's added `uid` is enumerable), and overlaying
// that object back onto the field crashes the form (React error #31). Such values are never
// stored, and any already stored by an earlier version are ignored on read.
const isFileLikeValue = (value) =>
  value instanceof File ||
  (value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    'uid' in value);

const getStorageKey = (userID) =>
  userID ? `${STORAGE_KEY_PREFIX}-${userID}` : STORAGE_KEY_PREFIX;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// Every tool's stored map for this user: `{ [script]: { [paramName]: value } }`.
const readAllStoredToolConfigs = (userID) => {
  try {
    const raw = localStorage.getItem(getStorageKey(userID));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch (err) {
    console.error('Error reading stored tool config:', err);
    return {};
  }
};

// The stored `paramName -> value` map for one tool.
export const readStoredToolConfig = (userID, script) => {
  const stored = readAllStoredToolConfigs(userID)[script];
  if (!isPlainObject(stored)) return {};
  return Object.fromEntries(
    Object.entries(stored).filter(
      ([name, value]) =>
        !EXCLUDED_PARAM_NAMES.has(name) && !isFileLikeValue(value),
    ),
  );
};

const writeStoredToolConfig = (userID, script, config) => {
  try {
    const all = readAllStoredToolConfigs(userID);
    localStorage.setItem(
      getStorageKey(userID),
      JSON.stringify({ ...all, [script]: config }),
    );
  } catch (err) {
    console.error('Error writing stored tool config:', err);
  }
};

// Shallow-merges `paramValues` into this tool's stored map for this user.
export const mergeStoredToolConfig = (userID, script, paramValues) => {
  if (!script || !paramValues) return;
  const current = readStoredToolConfig(userID, script);
  const next = { ...current };
  for (const [name, value] of Object.entries(paramValues)) {
    if (EXCLUDED_PARAM_NAMES.has(name)) continue;
    if (isFileLikeValue(value)) {
      delete next[name];
      continue;
    }
    next[name] = value;
  }
  writeStoredToolConfig(userID, script, next);
};

// Removes the given parameter names from this tool's stored map (used on Reset).
export const clearStoredToolConfig = (userID, script, paramNames) => {
  if (!script || !paramNames?.length) return;
  const current = readStoredToolConfig(userID, script);
  const next = { ...current };
  let changed = false;
  for (const name of paramNames) {
    if (name in next) {
      delete next[name];
      changed = true;
    }
  }
  if (changed) writeStoredToolConfig(userID, script, next);
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
//
// Two kinds of stored value are never applied, whatever put them in the map:
// - a plot context (see EXCLUDED_PARAM_NAMES), which must come from the open plot, and
// - a list for a parameter that isn't list-valued. A text input shows `['baseline']` as
//   "baseline", so the form looks right while the job is sent a list.
const overlayParam = (storedMap) => (param) => {
  if (!(param.name in storedMap)) return param;
  if (param.type === 'PlotContextParameter') return param;
  const storedValue = storedMap[param.name];
  if (Array.isArray(storedValue) && !Array.isArray(param.value)) return param;

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

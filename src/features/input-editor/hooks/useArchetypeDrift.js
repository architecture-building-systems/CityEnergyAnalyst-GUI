import { useMemo } from 'react';

// `envelope`/`hvac`/`supply` are a pure lookup on `const_type` in `archetypes_mapper.py`
// (`typology_df.merge(construction_type_DB, on='const_type')`) -- checked live against the
// construction-type database, no stored baseline needed. `indoor-comfort`/`internal-loads` are a
// ratio-weighted average across up to three `use_type`s, checked against the two baselines
// `GET /archetype-lock` provides instead. See `archetype_lock.py`'s module docstring for why.
const LOOKUP_TABS = ['envelope', 'hvac', 'supply'];
const COMPUTED_TABS = ['indoor-comfort', 'internal-loads'];

// Which of the two drift colours (`Table.jsx`'s `cea-input-archetype-drifted`/`-computed` CSS
// classes) a zone-tab rollup cell should take. Exported so `Table.jsx` compares against these
// instead of duplicating the string literals.
export const ZONE_DRIFT_DERIVED = 'derived';
export const ZONE_DRIFT_COMPUTED = 'computed';

/** Loose value equality for a cell read from two different sources (a live table vs. a lookup
 * database, or a live table vs. a JSON-stored baseline) -- numbers compare as numbers so `1` and
 * `1.0`/`"1.0"` agree, everything else as a trimmed string, and anything missing/`null`/
 * `undefined`/`NaN` as one shared "empty" value. The one comparator every drift check here uses,
 * whichever baseline it's checking against. */
function valuesEqual(a, b) {
  const empty = (v) =>
    v === null ||
    v === undefined ||
    v === '' ||
    (typeof v === 'number' && Number.isNaN(v));
  if (empty(a) && empty(b)) return true;
  if (empty(a) || empty(b)) return false;
  const numA = Number(a);
  const numB = Number(b);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA === numB;
  return String(a).trim() === String(b).trim();
}

/**
 * Per-building, per-tab archetype drift -- whether a building's derived data no longer matches
 * what its current archetype selection implies, computed entirely from data already loaded to
 * render the input editor (no extra request beyond the lock query itself).
 *
 * Two different granularities, because the two kinds of tab support two different guarantees:
 *
 * - Lookup tabs (`envelope`/`hvac`/`supply`) compare column-by-column against the live database,
 *   so a mismatch can be pinned to the exact cell(s) responsible -- a building whose entry here
 *   is a `Map` names precisely which columns disagree, each mapped to what the current
 *   `const_type` actually says that column should be (the value a re-lock would write).
 * - Computed tabs (`indoor-comfort`/`internal-loads`) stay row-level even though the backend
 *   now ships the actual baseline values (`mapped_computed_values`, one full row per building
 *   per tab -- see `archetype_lock.py`'s docstring for why that replaced a content hash): a
 *   moved `use_type` ratio conceptually reshuffles the whole weighted-average row (no cheap way
 *   to recompute what it *should* be -- that's `calculate_average_multiuse`'s job, not
 *   reproduced here), so pinning the flag to one cell would misattribute the cause even though
 *   the data to do so is right there. A building whose entry here is `true` means "this row",
 *   not "these cells".
 * - The synthetic `zone` entry (see below) is also a `Map`, but its value is a *category*
 *   (`ZONE_DRIFT_DERIVED`/`ZONE_DRIFT_COMPUTED`), not an expected value: unlike a lookup-tab
 *   cell, `const_type`/`use_type*` themselves aren't wrong, so there's nothing to attach beyond
 *   which of the two colours the cell should take (see `Table.jsx`'s two CSS classes).
 *
 * `zone` gets a cell flagged whenever the key column(s) driving it are implicated in a drifted
 * tab: `const_type` (tagged `ZONE_DRIFT_DERIVED`) when any of `envelope`/`hvac`/`supply` mismatch
 * for that building, and all of `use_type1/1r/2/2r/3/3r` (tagged `ZONE_DRIFT_COMPUTED`) when
 * `indoor-comfort` or `internal-loads` do (key-moved or content mismatch, either is enough --
 * see below) -- each rolled up in the same colour as the tab(s) that triggered it.
 *
 * :param tables: `data.tables` from `useInputs` -- `zone` plus the five derived tabs.
 * :param lock: `data` from `useArchetypeLock`.
 * :param constructionTypes: `useConstructionTypes()`'s data.
 * :return: `{ [tab]: { [building]: true | Map<column, expectedValue> } }` for every tab in
 *   `derived_tabs`, plus a synthetic `zone` entry of
 *   `{ [building]: Map<column, ZONE_DRIFT_DERIVED | ZONE_DRIFT_COMPUTED> }`.
 */
export function useArchetypeDrift({ tables, lock, constructionTypes }) {
  return useMemo(() => {
    const result = {};
    for (const tab of lock?.derived_tabs ?? []) result[tab] = {};
    // Not one of `derived_tabs` -- `zone` is the archetype key, not a derived output -- but a
    // building whose `const_type` drives at least one drifted lookup-tab cell gets its own
    // `const_type` cell flagged here too, so the row that needs a re-lock is visible without
    // opening `envelope`/`hvac`/`supply` individually. Populated below, alongside those tabs.
    result.zone = {};

    const zoneRows = tables?.zone ?? {};

    // Lookup tabs: live, exact, no baseline, cell-level. A building whose current value in a
    // column disagrees with what its current `const_type` implies has drifted in that cell --
    // whether that's because `const_type` moved and nothing re-derived it, or because the cell
    // itself was hand-edited. Both look identical here, and both mean the same thing: this cell
    // no longer describes what it claims to.
    for (const tab of LOOKUP_TABS) {
      const tabRows = tables?.[tab];
      if (
        !tabRows ||
        !constructionTypes ||
        !Object.keys(constructionTypes).length
      )
        continue;
      for (const building of Object.keys(tabRows)) {
        const constType = zoneRows[building]?.const_type;
        const reference = constructionTypes[constType];
        if (!reference) continue; // unknown/blank const_type -- nothing to compare against
        const currentRow = tabRows[building];
        const columns = Object.keys(reference).filter((c) => c in currentRow);
        const mismatched = columns.filter(
          (c) => !valuesEqual(currentRow[c], reference[c]),
        );
        if (mismatched.length) {
          result[tab][building] = new Map(
            mismatched.map((c) => [c, reference[c]]),
          );
          if (!result.zone[building]) result.zone[building] = new Map();
          result.zone[building].set('const_type', ZONE_DRIFT_DERIVED);
        }
      }
    }

    // Computed tabs: two independent checks, either one is enough to flag the whole row (see
    // the docstring above for why this stays row-level rather than cell-level).
    const keyColumnsForComputedTabs = (
      lock?.archetype_key_columns ?? []
    ).filter((c) => c !== 'const_type');
    const mappedUseTypes = lock?.mapped_use_types;
    const mappedValues = lock?.mapped_computed_values;

    for (const tab of COMPUTED_TABS) {
      const tabRows = tables?.[tab];
      if (!tabRows) continue;
      for (const building of Object.keys(tabRows)) {
        // (a) the use_type key moved since the last mapping, so nothing re-derived this tab.
        const baselineUseType = mappedUseTypes?.[building];
        const keyMoved =
          !!baselineUseType &&
          keyColumnsForComputedTabs.some(
            (c) => !valuesEqual(zoneRows[building]?.[c], baselineUseType[c]),
          );

        // (b) the tab's own content no longer matches what was baselined at the last mapping --
        // a direct hand-edit, independent of whether the key moved at all. Column-by-column
        // against the stored baseline values with the same `valuesEqual` used everywhere else
        // here -- no hash (or a second implementation of the backend's hashing/normalisation)
        // needed on either side.
        const baselineRow = mappedValues?.[building]?.[tab];
        const currentRow = tabRows[building];
        const contentChanged =
          !!baselineRow &&
          Object.keys(baselineRow).some(
            (c) => !valuesEqual(currentRow?.[c], baselineRow[c]),
          );

        if (keyMoved || contentChanged) {
          result[tab][building] = true;
          // Roll up onto zone's own use_type columns too, the same way a lookup-tab mismatch
          // rolls up onto `const_type` above -- whichever caused it, the whole key cluster is
          // marked together rather than trying to pin the exact column: `contentChanged` alone
          // has no column to blame at all (it's about the tab's content, not the key), and even
          // `keyMoved` is only ever checked as "did any of these move", not narrowed to which.
          if (!result.zone[building]) result.zone[building] = new Map();
          for (const c of keyColumnsForComputedTabs)
            result.zone[building].set(c, ZONE_DRIFT_COMPUTED);
        }
      }
    }

    return result;
  }, [tables, lock, constructionTypes]);
}

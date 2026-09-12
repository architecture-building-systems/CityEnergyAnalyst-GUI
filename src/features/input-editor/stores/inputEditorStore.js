import { create } from 'zustand';
import { createNestedProp, deleteNestedProp } from 'utils';
import { useCallback } from 'react';

// Every kind of pending change. Adding one here is enough for the card, the buttons and the
// discard/reset paths to pick it up.
export const CHANGE_KINDS = ['update', 'delete', 'add'];

const emptyChanges = () =>
  Object.fromEntries(CHANGE_KINDS.map((kind) => [kind, {}]));

export const useTableStore = create((set) => ({
  selected: [],
  selectionSource: null, // 'map' | 'table' | null
  changes: emptyChanges(),
  fetchedSchedules: new Set(),

  setSelected: (selected, source = null) =>
    set({ selected, selectionSource: source }),
  setChanges: (changes) => set({ changes }),
  updateChanges: (table, building, property, storedValue, newValue) =>
    set((state) => ({
      changes: {
        ...updateChanges(
          state.changes,
          table,
          building,
          property,
          storedValue,
          newValue,
        ),
      },
    })),
  discardChanges: () => set({ changes: { update: {}, delete: {}, add: {} } }),
  addFetchedSchedule: (building) =>
    set((state) => ({
      fetchedSchedules: state.fetchedSchedules.add(building),
    })),

  resetStore: () =>
    set({ changes: emptyChanges(), fetchedSchedules: new Set() }),
}));

function updateChanges(
  changes,
  table,
  building,
  property,
  storedValue,
  newValue,
) {
  // Check if update entry exists
  if (changes?.update?.[table]?.[building]?.[property]) {
    // Delete update if newValue equals oldValue else update newValue
    if (changes.update[table][building][property].oldValue == newValue)
      deleteNestedProp(changes.update, table, building, property);
    else changes.update[table][building][property].newValue = newValue;
  } else {
    // Create update entry if newValue is not equal storedValue
    if (storedValue != newValue) {
      createNestedProp(changes.update, table, building, property);
      changes.update[table][building][property] = {
        oldValue: storedValue,
        newValue: newValue,
      };
    }
  }
  return changes;
}

export const useSelected = () => useTableStore((state) => state.selected);
export const useSelectionSource = () =>
  useTableStore((state) => state.selectionSource);
export const useChanges = () => useTableStore((state) => state.changes);
/**
 * Whether there is anything to save.
 *
 * One definition, used by both the card that announces changes and the Save/Discard buttons
 * inside it. They were computed separately once, and adding a third kind of change (`add`) to
 * only one of them left the card showing with no buttons in it.
 */
export const hasChanges = (changes) =>
  CHANGE_KINDS.some((kind) => Object.keys(changes?.[kind] ?? {}).length > 0);

export const useChangesExist = () =>
  useTableStore((state) => hasChanges(state?.changes));
export const useSetSelectedFromMap = () => {
  const setSelected = useTableStore((state) => state.setSelected);
  return useCallback((selected) => setSelected(selected, 'map'), [setSelected]);
};
export const useSetSelectedFromTable = () => {
  const setSelected = useTableStore((state) => state.setSelected);
  return useCallback(
    (selected) => setSelected(selected, 'table'),
    [setSelected],
  );
};
export const useResetSelected = () => {
  const setSelected = useTableStore((state) => state.setSelected);
  return useCallback(() => setSelected([]), [setSelected]);
};
export const useSetChanges = () => useTableStore((state) => state.setChanges);
export const useUpdateChanges = () =>
  useTableStore((state) => state.updateChanges);
export const useDiscardChanges = () =>
  useTableStore((state) => state.discardChanges);

export const useFetchedSchedules = () =>
  useTableStore((state) => state.fetchedSchedules);
export const useAddFetchedSchedule = () =>
  useTableStore((state) => state.addFetchedSchedule);

export const useResetStore = () => useTableStore((state) => state.resetStore);

import { create } from 'zustand';
import { createNestedProp, deleteNestedProp } from '../../utils';

export const useTableStore = create((set) => ({
  selected: [],
  changes: { update: {}, delete: {} },
  fetchedSchedules: new Set(),

  setSelected: (selected) => set({ selected }),
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
  discardChanges: () => set({ changes: { update: {}, delete: {} } }),
  addFetchedSchedule: (building) =>
    set((state) => ({
      fetchedSchedules: state.fetchedSchedules.add(building),
    })),

  resetStore: () =>
    set({ changes: { update: {}, delete: {} }, fetchedSchedules: new Set() }),
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
export const useChanges = () => useTableStore((state) => state.changes);
export const useChangesExist = () =>
  useTableStore(
    (state) =>
      Object.keys(state?.changes?.delete).length > 0 ||
      Object.keys(state?.changes?.update).length > 0,
  );

export const useSetSelected = () => useTableStore((state) => state.setSelected);
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

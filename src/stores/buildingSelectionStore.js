import { create } from 'zustand';

const useBuildingSelectionStore = create((set, get) => ({
  active: false,
  selectedBuildings: [],
  availableChoices: [],
  onConfirm: null,

  startSelection: (choices, onConfirm) => {
    // Cancel any existing selection first
    const { active, cancelSelection } = get();
    if (active) cancelSelection();

    set({
      active: true,
      selectedBuildings: [],
      availableChoices: choices ?? [],
      onConfirm,
    });
  },

  toggleBuilding: (name) => {
    const { selectedBuildings, availableChoices } = get();
    if (!availableChoices.includes(name)) return;

    const index = selectedBuildings.indexOf(name);
    if (index !== -1) {
      set({ selectedBuildings: selectedBuildings.filter((b) => b !== name) });
    } else {
      set({ selectedBuildings: [...selectedBuildings, name] });
    }
  },

  setBuildings: (names) => {
    const { availableChoices } = get();
    set({
      selectedBuildings: names.filter((n) => availableChoices.includes(n)),
    });
  },

  confirmSelection: () => {
    const { selectedBuildings, onConfirm } = get();
    onConfirm?.(selectedBuildings);
    set({ active: false, selectedBuildings: [], availableChoices: [], onConfirm: null });
  },

  cancelSelection: () => {
    set({ active: false, selectedBuildings: [], availableChoices: [], onConfirm: null });
  },
}));

export const useBuildingSelectionActive = () =>
  useBuildingSelectionStore((state) => state.active);

export const useBuildingSelectionBuildings = () =>
  useBuildingSelectionStore((state) => state.selectedBuildings);

export const useStartBuildingSelection = () =>
  useBuildingSelectionStore((state) => state.startSelection);

export const useToggleBuilding = () =>
  useBuildingSelectionStore((state) => state.toggleBuilding);

export const useConfirmBuildingSelection = () =>
  useBuildingSelectionStore((state) => state.confirmSelection);

export const useCancelBuildingSelection = () =>
  useBuildingSelectionStore((state) => state.cancelSelection);

export default useBuildingSelectionStore;

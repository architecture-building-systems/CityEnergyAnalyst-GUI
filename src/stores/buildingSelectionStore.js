import { create } from 'zustand';

const useBuildingSelectionStore = create((set, get) => ({
  active: false,
  selectedBuildings: [],
  availableChoices: [],
  sessionOwner: null,
  // Map layer whose buildings can be picked: 'zone' or 'surroundings'.
  layer: 'zone',

  startSelection: (choices, ownerId, layer = 'zone') => {
    // Cancel any existing selection first
    const { active, cancelSelection } = get();
    if (active) cancelSelection();

    set({
      active: true,
      selectedBuildings: [],
      availableChoices: choices ?? [],
      sessionOwner: ownerId,
      layer,
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
      selectedBuildings: (names ?? []).filter((n) =>
        availableChoices.includes(n),
      ),
    });
  },

  confirmSelection: () => {
    set({
      active: false,
      selectedBuildings: [],
      availableChoices: [],
      sessionOwner: null,
      layer: 'zone',
    });
  },

  cancelSelection: () => {
    set({
      active: false,
      selectedBuildings: [],
      availableChoices: [],
      sessionOwner: null,
      layer: 'zone',
    });
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

export const useBuildingSelectionOwner = () =>
  useBuildingSelectionStore((state) => state.sessionOwner);

export default useBuildingSelectionStore;

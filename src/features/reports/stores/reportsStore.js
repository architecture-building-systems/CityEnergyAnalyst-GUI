import { create } from 'zustand';

export const useReportsStore = create((set, get) => ({
  // Current comparison mode: 'intra' (what-ifs within scenario) or 'inter' (across scenarios)
  mode: 'intra',

  // Selected feature to compare
  feature: 'demand',

  // Columns to display — each column is { scenario, whatif }
  columns: [],

  setMode: (mode) => set({ mode, columns: [] }),
  setFeature: (feature) => set({ feature }),

  addColumn: (column) => {
    const { columns } = get();
    // Prevent duplicates
    const exists = columns.some(
      (c) => c.scenario === column.scenario && c.whatif === column.whatif,
    );
    if (!exists) {
      set({ columns: [...columns, column] });
    }
  },

  removeColumn: (index) => {
    const { columns } = get();
    set({ columns: columns.filter((_, i) => i !== index) });
  },

  clearColumns: () => set({ columns: [] }),

  setColumns: (columns) => set({ columns }),
}));

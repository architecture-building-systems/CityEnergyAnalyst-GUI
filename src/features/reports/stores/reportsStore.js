import { create } from 'zustand';

/**
 * Reports Mode store.
 *
 * Views:
 *   'launch'          — entry point, single column + 3 action buttons
 *   'inter-scenario'  — columns = different scenarios, shared plot slots
 *   'inter-whatif'    — columns = what-if variants under one parent scenario, shared plot slots
 *   'inter-feature'   — columns = different feature result sets, independent plot slots
 *
 * Column shapes:
 *   Inter-scenario: { type: 'scenario', scenario: string }
 *   Inter-whatif:   { type: 'whatif',   scenario: string, whatif: string }
 *   Inter-feature:  { type: 'feature',  scenario: string, feature: string }
 *
 * Plot slots:
 *   Shared (inter-scenario / inter-whatif): all columns render the same list of slots.
 *   Independent (inter-feature): each column index has its own slot list.
 */

let nextSlotId = 1;
const makeSlotId = () => `slot-${nextSlotId++}`;

export const useReportsStore = create((set, get) => ({
  // ── View state ──────────────────────────────────────────────
  view: 'launch', // 'launch' | 'inter-scenario' | 'inter-whatif' | 'inter-feature'

  // Parent scenario for inter-whatif mode
  parentScenario: null,

  // ── Columns ─────────────────────────────────────────────────
  columns: [],

  // ── Plot slots (shared) ─────────────────────────────────────
  // Used by inter-scenario and inter-whatif modes.
  // Every column renders this same list of slots.
  sharedPlotSlots: [],

  // ── Plot slots (per-column) ─────────────────────────────────
  // Used by inter-feature mode.
  // Keyed by column index → array of slots.
  columnPlotSlots: {},

  // ── View transitions ────────────────────────────────────────

  /**
   * Enter inter-scenario mode with the given scenario columns.
   * @param {string[]} scenarios — scenario names
   */
  enterInterScenario: (scenarios) => {
    const columns = scenarios.map((s) => ({ type: 'scenario', scenario: s }));
    set({
      view: 'inter-scenario',
      columns,
      parentScenario: null,
      // Start empty — user adds plots via the drawer ("Add a plot" →
      // configure → Run). No default slot so ReportPlot never fetches
      // without an explicit plotConfig.
      sharedPlotSlots: [],
      columnPlotSlots: {},
    });
  },

  /**
   * Enter inter-whatif mode for a parent scenario.
   * @param {string} parentScenario
   * @param {string[]} whatifs — what-if names
   */
  enterInterWhatif: (parentScenario, whatifs) => {
    const columns = whatifs.map((w) => ({
      type: 'whatif',
      scenario: parentScenario,
      whatif: w,
    }));
    set({
      view: 'inter-whatif',
      columns,
      parentScenario,
      // Start empty — user adds plots via the drawer ("Add a plot" →
      // configure → Run). No default slot so ReportPlot never fetches
      // without an explicit plotConfig.
      sharedPlotSlots: [],
      columnPlotSlots: {},
    });
  },

  /**
   * Enter inter-feature mode with the given feature columns.
   * @param {{ scenario: string, feature: string, label: string }[]} featureColumns
   */
  enterInterFeature: (featureColumns) => {
    const columns = featureColumns.map((fc) => ({
      type: 'feature',
      scenario: fc.scenario,
      feature: fc.feature,
    }));

    // Each column gets its own default slot matching its feature
    // Each column starts empty — user adds plots via the drawer.
    const columnPlotSlots = {};
    featureColumns.forEach((_, i) => {
      columnPlotSlots[i] = [];
    });

    set({
      view: 'inter-feature',
      columns,
      parentScenario: null,
      sharedPlotSlots: [],
      columnPlotSlots,
    });
  },

  /** Return to launch view, clearing all comparison state. */
  startOver: () =>
    set({
      view: 'launch',
      columns: [],
      parentScenario: null,
      sharedPlotSlots: [],
      columnPlotSlots: {},
    }),

  // ── Column management ───────────────────────────────────────

  addColumn: (column) => {
    const { columns, view, columnPlotSlots } = get();

    // Prevent duplicates
    const isDuplicate = columns.some((c) => {
      if (c.type !== column.type) return false;
      if (c.type === 'scenario') return c.scenario === column.scenario;
      if (c.type === 'whatif')
        return c.scenario === column.scenario && c.whatif === column.whatif;
      if (c.type === 'feature')
        return c.scenario === column.scenario && c.feature === column.feature;
      return false;
    });
    if (isDuplicate) return;

    const newColumns = [...columns, column];
    const updates = { columns: newColumns };

    // For inter-feature, initialise the new column with an empty slot
    // list. The user adds plots via the drawer.
    if (view === 'inter-feature' && column.type === 'feature') {
      const newIndex = newColumns.length - 1;
      updates.columnPlotSlots = {
        ...columnPlotSlots,
        [newIndex]: [],
      };
    }

    set(updates);
  },

  removeColumn: (index) => {
    const { columns, columnPlotSlots } = get();
    const newColumns = columns.filter((_, i) => i !== index);

    // Re-index columnPlotSlots if in inter-feature mode
    const newColumnPlotSlots = {};
    Object.keys(columnPlotSlots).forEach((key) => {
      const k = Number(key);
      if (k < index) newColumnPlotSlots[k] = columnPlotSlots[k];
      else if (k > index) newColumnPlotSlots[k - 1] = columnPlotSlots[k];
      // k === index is dropped
    });

    set({ columns: newColumns, columnPlotSlots: newColumnPlotSlots });
  },

  // ── Shared plot slot management ─────────────────────────────

  addSharedPlotSlot: (slot) => {
    const { sharedPlotSlots } = get();
    set({
      sharedPlotSlots: [
        ...sharedPlotSlots,
        { ...slot, id: slot.id || makeSlotId() },
      ],
    });
  },

  removeSharedPlotSlot: (slotId) => {
    const { sharedPlotSlots } = get();
    set({
      sharedPlotSlots: sharedPlotSlots.filter((s) => s.id !== slotId),
    });
  },

  updateSharedPlotSlot: (slotId, updates) => {
    const { sharedPlotSlots } = get();
    set({
      sharedPlotSlots: sharedPlotSlots.map((s) =>
        s.id === slotId ? { ...s, ...updates } : s,
      ),
    });
  },

  // ── Per-column plot slot management (inter-feature) ─────────

  addColumnPlotSlot: (columnIndex, slot) => {
    const { columnPlotSlots } = get();
    const existing = columnPlotSlots[columnIndex] || [];
    set({
      columnPlotSlots: {
        ...columnPlotSlots,
        [columnIndex]: [...existing, { ...slot, id: slot.id || makeSlotId() }],
      },
    });
  },

  removeColumnPlotSlot: (columnIndex, slotId) => {
    const { columnPlotSlots } = get();
    const existing = columnPlotSlots[columnIndex] || [];
    set({
      columnPlotSlots: {
        ...columnPlotSlots,
        [columnIndex]: existing.filter((s) => s.id !== slotId),
      },
    });
  },

  updateColumnPlotSlot: (columnIndex, slotId, updates) => {
    const { columnPlotSlots } = get();
    const existing = columnPlotSlots[columnIndex] || [];
    set({
      columnPlotSlots: {
        ...columnPlotSlots,
        [columnIndex]: existing.map((s) =>
          s.id === slotId ? { ...s, ...updates } : s,
        ),
      },
    });
  },
}));

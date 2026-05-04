import { useMemo, useState } from 'react';
import { Modal, Select } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

import { useProjectStore } from 'features/project/stores/projectStore';
import { usePathwayOverview } from 'features/pathway/hooks/usePathwayOverview';
// Reuses the black-pill `cea-scenario-select` styling defined for
// `OverviewCard`'s pathway viewer in the main viewport so the
// Canvas Builder's pathway picker reads as the same control family.
import 'features/project/components/Cards/OverviewCard/OverviewCard.css';

import { useCanvasStore } from '../stores/canvasStore';

/**
 * Multi-pick pathway picker that lives in the column title row when
 * Pathway View is on. Replaces the *Add Scenario to compare* `+`.
 *
 * Implementation note: this is a **single-select** antd `<Select>` with
 * a hand-rolled toggle behaviour (option click flips the pathway in /
 * out of the selection without closing the popup). The same pattern
 * `PathwayPanel`'s `PathwaySelect` uses, and the only one that lines up
 * vertically with the 36 px black `cea-scenario-select` pill — antd's
 * `mode="multiple"` selector ships with its own internal layout that
 * doesn't centre on a forced height.
 *
 * Selection drives the canvas's view kind:
 *   - 1 pathway picked   → `enterPathwaySingle(...)` → `pathway-single`
 *   - ≥2 pathways picked → `enterPathwayMulti(...)`  → `pathway-multi`
 *   - empty selection    → fall back to launch view (`startOver`)
 *
 * Options come from the same `usePathwayOverview` hook as the
 * `OverviewCard` viewer in the main viewport, filtered to fully-baked
 * pathways only.
 */
const PathwayCompareSelect = () => {
  const scenario = useProjectStore((s) => s.scenario);
  const { data: overview } = usePathwayOverview();
  const enterPathwaySingle = useCanvasStore((s) => s.enterPathwaySingle);
  const enterPathwayMulti = useCanvasStore((s) => s.enterPathwayMulti);
  const startOver = useCanvasStore((s) => s.startOver);
  const setup = useCanvasStore((s) => s.comparisonSetup);
  const view = useCanvasStore((s) => s.view);

  const [open, setOpen] = useState(false);

  // Picker only accepts pathways whose every state year has been
  // simulated — otherwise per-column emission / demand fetches
  // would land on missing outputs. Mirrors the
  // `useHasSimulatedPathway` predicate that gates picker visibility.
  const simulatedPathways = useMemo(
    () => (overview?.pathways ?? []).filter((p) => p.all_simulated),
    [overview],
  );

  // Currently picked pathway names — derived from `comparisonSetup`
  // so the dropdown stays in sync with whatever entry action last
  // ran (including reload from disk).
  const picks = useMemo(() => {
    if (!setup) return [];
    if (setup.kind === 'pathway-single') {
      return setup.pathwayName ? [setup.pathwayName] : [];
    }
    if (setup.kind === 'pathway-multi') {
      return setup.pathwayNames ?? [];
    }
    return [];
  }, [setup]);

  const pickedSet = useMemo(() => new Set(picks), [picks]);
  const hasPathways = simulatedPathways.length > 0;

  const options = useMemo(
    () =>
      simulatedPathways.map((p) => ({
        value: p.pathway_name,
        label: (
          <PathwayOption
            name={p.pathway_name}
            checked={pickedSet.has(p.pathway_name)}
          />
        ),
      })),
    [simulatedPathways, pickedSet],
  );

  const enterMode = (nextPicks) => {
    if (nextPicks.length === 0) {
      startOver();
      return;
    }
    if (nextPicks.length === 1) {
      const pathway = simulatedPathways.find(
        (p) => p.pathway_name === nextPicks[0],
      );
      enterPathwaySingle(scenario, nextPicks[0], pathway?.years ?? []);
      return;
    }
    enterPathwayMulti(scenario, nextPicks);
  };

  /**
   * Apply a fresh selection. If the user is currently in a
   * non-pathway compare (inter-scenario / inter-whatif), confirm
   * before swapping out their existing columns — the column /
   * card layout is incompatible across modes, so silently entering
   * pathway view would make their compare-mode work disappear.
   * Going from launch / pathway-single / pathway-multi is safe and
   * happens immediately.
   */
  const applyPicks = (nextPicks) => {
    const wasInScenarioCompare =
      view === 'inter-scenario' || view === 'inter-whatif';
    if (!wasInScenarioCompare) {
      enterMode(nextPicks);
      return;
    }
    Modal.confirm({
      title: 'Switch to Pathway View?',
      content:
        'The current comparison columns will be cleared so you can compare pathways instead.',
      okText: 'Switch',
      cancelText: 'Cancel',
      onOk: () => {
        startOver();
        enterMode(nextPicks);
      },
    });
  };

  const handleSelect = (pathwayName) => {
    const nextPicks = pickedSet.has(pathwayName)
      ? picks.filter((name) => name !== pathwayName)
      : [...picks, pathwayName];
    applyPicks(nextPicks);
    // Keep the popup open so the user can toggle additional pathways
    // without re-opening it; matches the `PathwayPanel` UX.
    setOpen(true);
  };

  // Single-select `value` is the "primary" pathway (first picked) so
  // antd has something to anchor on; the rendered label is overridden
  // below to show the joined picks.
  const primary = picks[0] ?? undefined;
  const isEmpty = picks.length === 0;
  const className = `cea-scenario-select${
    isEmpty ? ' cea-scenario-select-empty' : ''
  }`;

  return (
    <Select
      className={className}
      style={selectStyle}
      styles={{ popup: { root: { width: 270 } } }}
      placeholder="Select Pathway(s)"
      options={hasPathways ? options : []}
      value={primary}
      onChange={() => {}}
      onSelect={handleSelect}
      open={hasPathways ? open : false}
      onOpenChange={hasPathways ? setOpen : undefined}
      disabled={!hasPathways}
      notFoundContent={<small>No pathways</small>}
      aria-label="Select pathways to compare"
      labelRender={() =>
        picks.length > 0 ? (
          <span style={joinedLabelStyle} title={picks.join('; ')}>
            {picks.join('; ')}
          </span>
        ) : null
      }
    />
  );
};

/**
 * Dropdown row — pathway name on the left, a checkmark on the right
 * when the pathway is currently picked. Same visual pattern as the
 * Pathway Panel's option rows.
 */
const PathwayOption = ({ name, checked }) => (
  <div style={optionRowStyle}>
    <span style={optionLabelStyle} title={name}>
      {name}
    </span>
    {checked && <CheckOutlined style={optionCheckStyle} />}
  </div>
);

// Width sized to comfortably show two pathway names + the dropdown
// arrow without dominating the title row.
const selectStyle = {
  minWidth: 220,
  maxWidth: 360,
};

const joinedLabelStyle = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const optionRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const optionLabelStyle = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flexGrow: 1,
  minWidth: 0,
};

const optionCheckStyle = {
  fontSize: 14,
  color: '#000',
};

export default PathwayCompareSelect;

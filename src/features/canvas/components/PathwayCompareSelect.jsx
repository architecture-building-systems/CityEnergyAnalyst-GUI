import { useMemo, useRef, useState } from 'react';
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
  // Picks staged while the dropdown is OPEN. Selections only commit
  // (entering pathway-single / -multi) when the popup closes — so a
  // user who intends to pick two pathways can finish toggling
  // without the canvas snapping into pathway-single after the first
  // click and tearing down their work mid-selection.
  const [pendingPicks, setPendingPicks] = useState(null);
  // antd's single-select Select fires onOpenChange(false) immediately
  // after onSelect (auto-close). Without this guard, picking the
  // first pathway would trigger the close handler and commit before
  // the user could toggle a second pathway. The flag is set in
  // handleSelect and consumed (then cleared) by the very next
  // handleOpenChange(false).
  const justSelectedRef = useRef(false);

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

  // While the popup is open, the displayed selection mirrors
  // `pendingPicks`; when closed, it falls back to the committed
  // `picks` so an external state change (e.g. resume from disk)
  // is reflected immediately.
  const displayedPicks = pendingPicks ?? picks;
  const pickedSet = useMemo(() => new Set(displayedPicks), [displayedPicks]);
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
    // Stage the toggle locally — don't enter pathway mode yet.
    // Commits to the canvas store on popup close (`handleOpenChange`).
    setPendingPicks((prev) => {
      const current = prev ?? picks;
      return current.includes(pathwayName)
        ? current.filter((name) => name !== pathwayName)
        : [...current, pathwayName];
    });
    // Mark that the immediately-following onOpenChange(false) is
    // antd's auto-close after a selection, not a user dismissal,
    // so handleOpenChange skips the commit.
    justSelectedRef.current = true;
  };

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) {
      // Seed the staging buffer from the committed picks so the
      // user starts editing from the current selection.
      setPendingPicks(picks);
      setOpen(true);
      return;
    }
    // antd auto-closes after onSelect on a single-select. Swallow
    // that close so the popup stays open and the staged pick stays
    // pending until the user explicitly dismisses the dropdown.
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    // Closing the popup commits the staged selection.
    setOpen(false);
    if (pendingPicks != null && !arrayShallowEqual(pendingPicks, picks)) {
      applyPicks(pendingPicks);
    }
    setPendingPicks(null);
  };

  // Single-select `value` is the "primary" pathway (first picked) so
  // antd has something to anchor on; the rendered label is overridden
  // below to show the joined picks.
  const primary = displayedPicks[0] ?? undefined;
  const isEmpty = displayedPicks.length === 0;
  const className = `cea-scenario-select${
    isEmpty ? ' cea-scenario-select-empty cea-select-glow' : ''
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
      onOpenChange={hasPathways ? handleOpenChange : undefined}
      disabled={!hasPathways}
      notFoundContent={<small>No pathways</small>}
      aria-label="Select pathways to compare"
      labelRender={() =>
        displayedPicks.length > 0 ? (
          <span style={joinedLabelStyle} title={displayedPicks.join('; ')}>
            {displayedPicks.join('; ')}
          </span>
        ) : null
      }
    />
  );
};

const arrayShallowEqual = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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

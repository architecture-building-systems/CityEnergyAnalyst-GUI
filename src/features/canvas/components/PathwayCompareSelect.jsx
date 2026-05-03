import { useMemo } from 'react';
import { Select } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import { usePathwayOverview } from 'features/pathway/hooks/usePathwayOverview';
// Reuses the black-pill `cea-scenario-select` styling defined for
// `OverviewCard`'s pathway viewer in the main viewport so the
// Canvas Builder's pathway picker reads as the same control family.
import 'features/project/components/Cards/OverviewCard/OverviewCard.css';

import { useCanvasStore } from '../stores/canvasStore';

/**
 * Multi-select pathway picker that lives in the Canvas Builder's
 * column title row whenever Pathway View is on (`pathwayView ===
 * true` on the canvas store). Replaces the "+ Add Scenario to
 * compare" button.
 *
 * Selection drives the canvas's view kind:
 *   - 1 pathway picked  → `enterPathwaySingle(...)` → `pathway-single`
 *   - ≥2 pathways picked → `enterPathwayMulti(...)`  → `pathway-multi`
 *   - empty selection    → fall back to launch view (`startOver`)
 *
 * Options come from the same `usePathwayOverview` hook as the
 * `OverviewCard` viewer in the main viewport, filtered to only
 * fully-baked pathways — picking a non-baked pathway would land the
 * user in a state with missing simulation outputs and no useful
 * comparison data.
 */
const PathwayCompareSelect = () => {
  const scenario = useProjectStore((s) => s.scenario);
  const { data: overview } = usePathwayOverview();
  const enterPathwaySingle = useCanvasStore((s) => s.enterPathwaySingle);
  const enterPathwayMulti = useCanvasStore((s) => s.enterPathwayMulti);
  const startOver = useCanvasStore((s) => s.startOver);
  const setup = useCanvasStore((s) => s.comparisonSetup);

  const bakedPathways = useMemo(() => {
    return (overview?.pathways ?? []).filter((p) => p.all_baked);
  }, [overview]);

  const options = useMemo(
    () =>
      bakedPathways.map((p) => ({
        label: p.pathway_name,
        value: p.pathway_name,
      })),
    [bakedPathways],
  );

  const value = useMemo(() => {
    if (!setup) return [];
    if (setup.kind === 'pathway-single') {
      return setup.pathwayName ? [setup.pathwayName] : [];
    }
    if (setup.kind === 'pathway-multi') {
      return setup.pathwayNames ?? [];
    }
    return [];
  }, [setup]);

  const handleChange = (next) => {
    const picks = (next || []).filter((name) =>
      bakedPathways.some((p) => p.pathway_name === name),
    );
    if (picks.length === 0) {
      startOver();
      return;
    }
    if (picks.length === 1) {
      const pathway = bakedPathways.find((p) => p.pathway_name === picks[0]);
      enterPathwaySingle(scenario, picks[0], pathway?.years ?? []);
      return;
    }
    enterPathwayMulti(scenario, picks);
  };

  const isEmpty = value.length === 0;
  const className = `cea-scenario-select${isEmpty ? ' cea-scenario-select-empty' : ''}`;

  return (
    <Select
      mode="multiple"
      className={className}
      style={selectStyle}
      placeholder="Select pathway(s) to compare"
      options={options}
      value={value}
      onChange={handleChange}
      maxTagCount="responsive"
      disabled={options.length === 0}
      aria-label="Pick pathways to compare"
    />
  );
};

// Width sized to comfortably show two pathway names + the dropdown
// arrow without dominating the title row. `maxTagCount: 'responsive'`
// collapses extras into a `+N` chip when the user picks more.
const selectStyle = {
  minWidth: 220,
  maxWidth: 360,
};

export default PathwayCompareSelect;

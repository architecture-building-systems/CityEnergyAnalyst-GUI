/**
 * `KpiRibbon` — read-only KPI strip under the OverviewCard. Lives
 * in the main project viewport, NOT the Canvas Builder.
 *
 *   <KpiRibbon project="..." scenario="..." />
 *
 * Behaviour:
 *  - Shows two pinned KPI tiles by default (collapsed state, one
 *    row × 2 columns). When the user has pinned more than two,
 *    a `▾ N more` chip appears top-right of row 1; clicking it
 *    expands the rest of the picks (up to a 6-cap, in 2-col rows).
 *  - Clicking any tile (or the trailing `+ Pin KPIs` slot when
 *    fewer than 2 are pinned) opens the canvas's `KpiPicker` in
 *    replace-mode — the user picks up to six KPIs to pin and
 *    confirm replaces the entire visible set.
 *  - Tiles are draggable: dragging one onto another reorders the
 *    pick list (HTML5 drag-and-drop, no extra deps). The browser
 *    fires `click` only when no drag actually happened, so click-
 *    to-edit and drag-to-reorder coexist on the same surface.
 *    Reordering is only possible across currently-visible tiles
 *    — to move a hidden tile forward, expand first.
 *  - Pinned IDs persist per (project, scenario) in `localStorage`
 *    via `useOverviewKpiPicks`; defaults seed every fresh
 *    scenario with GFA + EUI so the ribbon is never empty out
 *    of the box.
 *  - Pathway-state aware: `dataScenario` (when set) overrides
 *    `scenario` for the KPI fetches only — persistence stays
 *    keyed on the parent scenario name so pinned KPIs survive
 *    timeline navigation. The OverviewCard derives the child
 *    state's folder path from `useProjectStore.childScenario`
 *    and threads it through here whenever a state year is
 *    active; values then update as the user walks the timeline.
 *  - The "KPI" section divider is rendered by the OverviewCard,
 *    matching the Project / Scenario / Pathway divider treatment
 *    above. This component owns only the tile grid + chip + modal.
 */

import { useMemo, useState } from 'react';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';

import FeatureCardKpi from 'features/canvas/components/FeatureCardKpi';
import KpiPicker from 'features/canvas/components/KpiPicker';

import { MAX_KPI_PICKS, useOverviewKpiPicks } from './useOverviewKpiPicks';
import './OverviewCard.css';

// How many tiles stay visible in the collapsed state. Chosen so
// row 1 always reads as a single row of two cards regardless of
// how many KPIs the user has pinned.
const VISIBLE_COLLAPSED = 2;

const KpiRibbon = ({ project, scenario, dataScenario = null, whatif }) => {
  const [picks, setPicks] = useOverviewKpiPicks(project, scenario);

  // Effective scenario for KPI fetches. When the OverviewCard's
  // pathway timeline activates a state year, `dataScenario` is
  // the child state's folder path so values reflect that year;
  // otherwise the parent scenario name is used. Persistence
  // (`useOverviewKpiPicks` above) intentionally stays keyed on
  // `scenario` so the user's pin selection survives walking the
  // timeline.
  const effectiveScenario = dataScenario ?? scenario;
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Drag-reorder state. `dragIndex` is the source tile being
  // dragged (in the picks-array index space, not visible-slice).
  // `overIndex` is the tile currently under the cursor — gets
  // a CEA-purple outline so the user sees where the drop will
  // land. Both reset on dragend / drop / cancel.
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const handleDragStart = (i) => (e) => {
    setDragIndex(i);
    // Firefox refuses to start a drag without setData; the
    // payload is unused, the component reads `dragIndex` from
    // state. `effectAllowed = move` matches the cursor visual.
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(i));
  };

  const handleDragOver = (i) => (e) => {
    // preventDefault on dragover is what makes the element a
    // valid drop target — without it the drop event never
    // fires. dropEffect aligns the cursor with effectAllowed.
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIndex !== i) setOverIndex(i);
  };

  const handleDrop = (i) => (e) => {
    e.preventDefault();
    if (dragIndex == null || dragIndex === i) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    // Splice-out then splice-in at the target index. When
    // dragging right (source < target), the splice-out shifts
    // the target down by one — the math still lands the moved
    // item at the original target position because both indices
    // operate on the SAME post-removal array.
    const next = picks.slice();
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setPicks(next);
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // Synthesise the minimum `card` shape `FeatureCardKpi` expects
  // (it reads `card.kpiId` to fetch + `card.id` for the
  // data-card-id attribute used by the canvas's
  // feature-focus-landing flow). Stable id keys help React
  // reconcile across re-renders.
  const cards = useMemo(
    () =>
      picks.map((kpiId) => ({
        id: `overview-kpi-${kpiId}`,
        type: 'kpi',
        kpiId,
      })),
    [picks],
  );

  const overflowCount = Math.max(picks.length - VISIBLE_COLLAPSED, 0);
  const visibleCards = expanded ? cards : cards.slice(0, VISIBLE_COLLAPSED);

  const handleConfirm = (kpiIds) => {
    setPicks(kpiIds);
    setPickerOpen(false);
    // Auto-collapse only when the new selection no longer has
    // overflow — otherwise keep the user's expanded state so
    // they can see the cards they just pinned.
    if (kpiIds.length <= VISIBLE_COLLAPSED) setExpanded(false);
  };

  // Empty-picks edge case: render a single placeholder pill that
  // opens the picker. Keeps the ribbon's footprint stable instead
  // of popping in / out as the user clears / restores picks.
  if (picks.length === 0) {
    return (
      <div style={emptyStateStyle}>
        <button
          type="button"
          style={emptyButtonStyle}
          onClick={() => setPickerOpen(true)}
        >
          + Pin up to {MAX_KPI_PICKS} KPIs
        </button>
        <KpiPicker
          open={pickerOpen}
          onCancel={() => setPickerOpen(false)}
          onConfirm={handleConfirm}
          initialSelection={picks}
          maxSelected={MAX_KPI_PICKS}
        />
      </div>
    );
  }

  return (
    <>
      <div style={containerStyle} aria-label="Pinned KPIs">
        {/* Overflow chip — top-right of row 1 when there are
            more picks than the collapsed view shows. Click
            toggles expand/collapse. */}
        {overflowCount > 0 && (
          <button
            type="button"
            style={chipStyle}
            onClick={() => setExpanded((v) => !v)}
            aria-label={
              expanded ? 'Hide extra KPIs' : `Show ${overflowCount} more KPIs`
            }
          >
            {expanded ? (
              <>
                <CaretUpOutlined style={chipIconStyle} /> Hide
              </>
            ) : (
              <>
                <CaretDownOutlined style={chipIconStyle} /> {overflowCount} more
              </>
            )}
          </button>
        )}

        <div style={gridStyle}>
          {visibleCards.map((card, idx) => {
            // `idx` is the visible-slice index, which == picks-
            // array index because the slice always starts at 0.
            const isDragging = dragIndex === idx;
            const isOver =
              overIndex === idx && dragIndex != null && dragIndex !== idx;
            return (
              <div
                key={card.id}
                className="cea-overview-kpi-tile"
                role="button"
                tabIndex={0}
                draggable
                onDragStart={handleDragStart(idx)}
                onDragOver={handleDragOver(idx)}
                onDrop={handleDrop(idx)}
                onDragEnd={handleDragEnd}
                onClick={() => setPickerOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPickerOpen(true);
                  }
                }}
                style={{
                  ...tileWrapperStyle,
                  ...(isDragging ? tileDraggingStyle : null),
                  ...(isOver ? tileDropTargetStyle : null),
                }}
                aria-label="Pinned KPI tile — click to edit pins, drag to reorder"
                title="Click to change pinned KPIs · Drag to reorder"
              >
                <FeatureCardKpi
                  card={card}
                  project={project}
                  scenario={effectiveScenario}
                  whatif={whatif}
                  readOnly
                />
              </div>
            );
          })}
        </div>
      </div>

      <KpiPicker
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        onConfirm={handleConfirm}
        initialSelection={picks}
        maxSelected={MAX_KPI_PICKS}
      />
    </>
  );
};

// Container needs `position: relative` so the overflow chip can
// anchor against the top-right corner. The chip floats over the
// row 1 tiles' top edge — out of the way of the value rows but
// visually attached to the ribbon.
const containerStyle = {
  position: 'relative',
};

const chipStyle = {
  position: 'absolute',
  top: -2,
  right: 0,
  zIndex: 2,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  fontSize: 10,
  fontWeight: 500,
  color: '#666',
  background: '#f5f5f5',
  border: '1px solid #e8e8e8',
  borderRadius: 999,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const chipIconStyle = {
  fontSize: 9,
};

// 2-column grid — equal-width cells + 8 px gap. `align-items:
// stretch` keeps row heights even (FeatureCardKpi sizes its body
// to 100% height of the cell, so all cards in a row land at the
// same baseline). Row gap matches column gap so a 3-row expanded
// view reads as a uniform pinboard.
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 8,
  alignItems: 'stretch',
};

// `<div role="button">` wrapping each tile so the whole surface
// is clickable AND draggable. A native `<button>` would fight the
// drag gesture (browsers handle drag-on-button inconsistently),
// so we hand-roll the role/tabIndex + onKeyDown for keyboard
// access. Visual identity is still owned by `FeatureCardKpi`
// itself — this wrapper only adds the drag affordance and the
// drop-target outline state.
const tileWrapperStyle = {
  display: 'block',
  width: '100%',
  // `grab` reads as "this is rearrangeable" for sortable lists —
  // more discoverable than a plain pointer, and the click still
  // works because the browser fires click only when no drag
  // actually happened.
  cursor: 'grab',
  // 2 px of transparent border space reserved so the
  // drop-target outline (below) doesn't shift sibling tiles
  // when it lights up. Without this, tiles jump around as the
  // user drags between them.
  border: '2px solid transparent',
  borderRadius: 14,
  // Smooth-fade the drop-target highlight rather than popping.
  transition: 'border-color 80ms ease, opacity 80ms ease',
  // Wrapper itself shouldn't intercept the FeatureCardKpi's
  // tooltip / delete absolute positioning (delete is hidden via
  // `readOnly` here, but stay defensive).
  position: 'relative',
};

// Source tile while the user holds it — fades it back so the
// user can see what they're dragging WITHOUT the original tile
// dominating their view.
const tileDraggingStyle = {
  opacity: 0.4,
  cursor: 'grabbing',
};

// Drop target tile — CEA-purple outline so the user sees
// exactly where the dragged tile will land on release.
const tileDropTargetStyle = {
  borderColor: '#7e559a',
};

const emptyStateStyle = {
  padding: '4px 0',
};

const emptyButtonStyle = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 12,
  color: '#888',
  background: '#fafafa',
  border: '1px dashed #d9d9d9',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export default KpiRibbon;

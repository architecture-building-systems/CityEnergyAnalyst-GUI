import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';

import {
  BinAnimationIcon,
  InputEditorIcon,
  RefreshIcon,
  TimelineIcon,
} from 'assets/icons';
import { ERROR_RED } from 'constants/theme';
import { useProjectStore } from 'features/project/stores/projectStore';

import { useCanvasStore } from '../stores/canvasStore';
import CanvasPlot, { fitPlotToParent } from './CanvasPlot';
import './PathwayTimelineStrip.css';

const TIMELINE_SCRIPT = 'plot-pathway-emission-timeline';

// Force the x-axis to label only the years ending in `5`
// (Y_2005, Y_2015, …). Pulling years out of the rendered figure
// data lets us pin exact tick positions regardless of plotly's
// auto-ticking (which emits every 2nd year by default and so
// never lands on a year ending in 5).
//
// The backend's axis type varies by plot-type — line is numeric,
// stacked-area is categorical — and plotly drops `tickvals` that
// don't match the axis type (the symptom: "all labels gone"). We
// detect the type from `div._fullLayout.xaxis.type` and pass
// tickvals in the matching shape (numbers for numeric / date,
// category strings for categorical).
function applyStateYearTicks(div) {
  if (!div || !window.Plotly?.relayout) return;
  const layout = div._fullLayout;
  const xData = div.data?.[0]?.x;
  if (!Array.isArray(xData) || xData.length === 0) return;

  const isCategorical = layout?.xaxis?.type === 'category';

  const matches = xData
    .map((raw) => {
      const m = String(raw).match(/(\d+)/);
      return m ? { raw, year: parseInt(m[1], 10) } : null;
    })
    .filter((entry) => entry && entry.year % 10 === 5);

  if (matches.length === 0) return;

  const tickvals = isCategorical
    ? matches.map((m) => m.raw)
    : matches.map((m) => m.year);
  const ticktext = matches.map((m) => `Y_${m.year}`);

  window.Plotly.relayout(div, {
    'xaxis.tickmode': 'array',
    'xaxis.tickvals': tickvals,
    'xaxis.ticktext': ticktext,
    // Plotly draws vertical gridlines at the major tick positions,
    // so pinning tickvals above also pins the gridlines to the
    // years ending in 5. Make sure the grid is on (the standalone
    // builder may have flipped it off through `update_layout`).
    'xaxis.showgrid': true,
  });
  raiseGridlayer(div);
}

// Move every subplot's `gridlayer` to after the corresponding
// `plot` group in the SVG so the gridlines paint on top of the
// data fill instead of behind it. SVG paints in document order
// and ignores `z-index`, so plotly's `xaxis.layer: 'above traces'`
// only lifts the axis lines / labels — not the gridlines. The
// move is idempotent: the second call does nothing because
// `gridlayer` is already the last sibling.
function raiseGridlayer(div) {
  const subplots = div?.querySelectorAll('g.cartesianlayer > g.subplot');
  subplots?.forEach((subplot) => {
    const grid = subplot.querySelector(':scope > g.gridlayer');
    if (grid && subplot.lastElementChild !== grid) {
      subplot.appendChild(grid);
    }
  });
}

// Plotly may re-derive auto-ticks on resize / refit / autorange
// settle and overwrite our explicit tickvals. Watch the xaxis
// tick layer and re-apply the filter whenever plotly mutates it.
// Returns a cleanup function the caller invokes on unmount.
function watchXTicks(div) {
  if (!div || typeof MutationObserver === 'undefined') return () => {};
  const layer = div.querySelector('.xaxislayer-above');
  if (!layer) return () => {};
  const observer = new MutationObserver(() => applyStateYearTicks(div));
  observer.observe(layer, { childList: true, subtree: true });
  return () => observer.disconnect();
}

// How far the chart-side segment of the connector polyline drops
// below the plot area (into the bottom margin), in pixels.
const MARKER_OVERHANG_PX = 20;

// The connector dot lands inside the title card, `DOT_INSET_PX`
// from the card's right edge. `DOT_RADIUS_PX` is its radius.
const DOT_INSET_PX = 12;
const DOT_RADIUS_PX = 3;

// Measure the screen-space positions needed to draw a connector
// from each state year on the chart down to its matching column-
// header card. Returns one `{ x1, y1, x2, y2 }` entry per state-
// year, in connector-local coords. Resilient — returns [] if the
// chart isn't rendered yet.
function computeConnections(slotEl, connectorEl, stateYears) {
  if (!slotEl || !connectorEl) return [];
  if (!Array.isArray(stateYears) || stateYears.length === 0) return [];

  const plotDiv = slotEl.querySelector('.js-plotly-plot, .plotly-graph-div');
  const layout = plotDiv?._fullLayout;
  const xaxis = layout?.xaxis;
  const svg = plotDiv?.querySelector('svg.main-svg');
  if (!plotDiv || !layout || !xaxis || !svg) return [];
  // `l2p` (linear-to-pixel) works on every axis type. Plotly's
  // `c2p` returns `undefined` for categorical axes when given a
  // category name (it expects the category *index*). For
  // categorical we look the index up in `xData` ourselves; for
  // numeric we pass the value through.
  if (typeof xaxis.l2p !== 'function') return [];

  const xData = plotDiv.data?.[0]?.x;
  if (!Array.isArray(xData) || xData.length === 0) return [];
  const isCategorical = xaxis.type === 'category';

  const svgRect = svg.getBoundingClientRect();
  const connRect = connectorEl.getBoundingClientRect();
  const xOffset = xaxis._offset ?? 0;
  // Bottom of the plot area in SVG-local pixels. `layout.margin.b`
  // is the bottom margin reserved for x-axis labels.
  const plotBottomInSvg =
    (layout.height ?? svgRect.height) - (layout.margin?.b ?? 0);

  const columnsRow = connectorEl.nextElementSibling;
  if (!columnsRow) return [];
  const columnCells = Array.from(columnsRow.children);

  const out = [];
  stateYears.forEach((year, i) => {
    const cell = columnCells[i];
    if (!cell) return;
    const titleCard =
      cell.firstElementChild?.firstElementChild?.firstElementChild;
    if (!titleCard) return;

    let linearVal;
    if (isCategorical) {
      const x0 = xData.find(
        (raw) => String(raw).match(/(\d+)/)?.[1] === String(year),
      );
      if (x0 == null) return;
      linearVal = xData.indexOf(x0);
      if (linearVal < 0) return;
    } else {
      linearVal = year;
    }
    const xPx = xaxis.l2p(linearVal);
    if (typeof xPx !== 'number' || Number.isNaN(xPx)) return;

    const x1Viewport = svgRect.left + xOffset + xPx;
    const plotTopInSvg = layout.margin?.t ?? 0;
    const tRect = titleCard.getBoundingClientRect();

    out.push({
      // Top of the plot area — the polyline starts here as a
      // vertical line that crosses the chart, drops below the
      // x-axis by `MARKER_OVERHANG_PX`, then curves into the dot.
      x1: x1Viewport - connRect.left,
      chartTopY: svgRect.top + plotTopInSvg - connRect.top,
      // Where the vertical chart segment ends and the curve begins.
      curveStartY:
        svgRect.top + plotBottomInSvg + MARKER_OVERHANG_PX - connRect.top,
      // Dot anchor: INSIDE the title card near its right edge,
      // vertically centred. `DOT_INSET_PX` is the distance from
      // the card's right edge to the dot's centre.
      x2: tRect.right - DOT_INSET_PX - connRect.left,
      y2: tRect.top + tRect.height / 2 - connRect.top,
      // Top edge of the title card. The curve finishes here with
      // a vertical tangent and a straight vertical segment carries
      // the line down to the dot — keeps the in-card section
      // perfectly straight regardless of curve splining.
      cardTopY: tRect.top - connRect.top,
    });
  });

  return out;
}

/**
 * Pathway Emission Timeline card spanning the canvas above the
 * state-year columns. **Custom chrome** for this one card only —
 * deliberately bypasses `FeatureCardShell` + `PlotSlotCard` because
 * the user wants:
 *   - title row, icon, *and* the chart caption on a single line;
 *   - Edit / Refit / Delete merged into one icon-button row;
 *   - the chart legend pinned above the plot area instead of
 *     `CanvasPlot`'s default legend-below-chart layout.
 *
 * Touching the shared shell / slot / plot components would change
 * every other plot card in the app, so the layout (and the
 * legend-on-top override in `PathwayTimelineStrip.css`) lives here
 * verbatim.
 *
 * Edit opens the standard `<PlotEditModal>` drawer prefilled with
 * the current plot config (parent scenario + chosen pathway). The
 * user can change plot-type / categories / etc; on save the new
 * config is stashed on the canvas store
 * (`pathwayTimelinePlotConfig`) and wins on next render. The
 * `existing-pathway-names` parameter is always re-injected with
 * the active pick so the override survives a pathway-pick change.
 */
const PathwayTimelineStrip = ({ onOpenDrawer }) => {
  const view = useCanvasStore((s) => s.view);
  const pathwayName = useCanvasStore((s) => s.comparisonSetup?.pathwayName);
  const parentScenario = useCanvasStore((s) => s.parentScenario);
  const startOver = useCanvasStore((s) => s.startOver);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const overrideConfig = useCanvasStore((s) => s.pathwayTimelinePlotConfig);
  const setOverrideConfig = useCanvasStore(
    (s) => s.setPathwayTimelinePlotConfig,
  );
  const stateYears = useCanvasStore(
    (s) => s.comparisonSetup?.stateYears ?? null,
  );
  const project = useProjectStore((s) => s.project);

  const [caption, setCaption] = useState('');
  const slotRef = useRef(null);
  const connectorRef = useRef(null);
  const [connections, setConnections] = useState([]);
  // Bumped in `handlePlotReady` so the connector-measurement effect
  // can re-run once plotly has initialised — without this, the
  // effect mounts before plotly is ready and never attaches its
  // event listeners.
  const [plotReadyVersion, setPlotReadyVersion] = useState(0);

  /** Effective config = override-or-default with the live pathway
   * pick re-injected. Re-running this on every render means the
   * pathway picker can change picks without losing the user's
   * other parameter edits. */
  const plotConfig = useMemo(() => {
    if (!pathwayName) return null;
    const base =
      overrideConfig && overrideConfig.script === TIMELINE_SCRIPT
        ? overrideConfig
        : { script: TIMELINE_SCRIPT, parameters: {} };
    return {
      ...base,
      parameters: {
        ...(base.parameters || {}),
        'existing-pathway-names': [pathwayName],
      },
    };
  }, [pathwayName, overrideConfig]);

  const handleRefit = () => {
    slotRef.current
      ?.querySelectorAll('.js-plotly-plot, .plotly-graph-div')
      .forEach((div) => fitPlotToParent(div));
  };

  // Live ref so observer/event callbacks below can read the
  // current `stateYears` without re-attaching on every picker
  // change.
  const stateYearsRef = useRef(stateYears);
  stateYearsRef.current = stateYears;

  // Move the y-axis (ticks + title) to the right side of the chart.
  // Done at runtime via `Plotly.relayout` rather than in the figure
  // template because the same backend script is also used by the
  // standalone Pathway Builder where the axis stays on the left.
  //
  // Render tick labels INSIDE the plot area (`ticklabelposition`)
  // so they don't depend on `margin.r` for room — the right-side
  // axis was losing the SI suffix because the magnitude prefix
  // ("M", "K") sits past the plot edge and gets clipped by the
  // card's `overflow: hidden`. Pinning labels inside also lets us
  // stop fighting plotly's auto-margin. `tickformat: '~s'` forces
  // an explicit SI suffix on every tick (e.g. "60M", "1.2G") and
  // `automargin: false` stops plotly from re-growing the right
  // margin once the labels move inside.
  const handlePlotReady = (div) => {
    const relayout = {
      'yaxis.side': 'right',
      'yaxis.tickformat': '~s',
      // Render labels OUTSIDE the plot area on the right so the
      // coloured data fill stops cleanly at the y-axis instead of
      // running under the tick text. `automargin: true` lets
      // plotly grow `margin.r` enough to seat the longest label.
      'yaxis.ticklabelposition': 'outside',
      'yaxis.automargin': true,
    };
    // Tighten the x-axis range to the actual data extent so the
    // y-axis line sits flush against the rightmost data point.
    // Plotly's default `autorange` adds a small padding past the
    // last category, leaving an empty band between the coloured
    // area and the axis line; pinning `xaxis.range` removes it.
    const layout = div._fullLayout;
    const xData = div.data?.[0]?.x;
    if (Array.isArray(xData) && xData.length > 0) {
      const isCategorical = layout?.xaxis?.type === 'category';
      if (isCategorical) {
        relayout['xaxis.range'] = [0, xData.length - 1];
      } else {
        const nums = xData
          .map((v) => Number(String(v).match(/(\d+)/)?.[1]))
          .filter((n) => Number.isFinite(n));
        if (nums.length > 0) {
          relayout['xaxis.range'] = [Math.min(...nums), Math.max(...nums)];
        }
      }
    }
    window.Plotly?.relayout?.(div, relayout);
    applyStateYearTicks(div);
    // Triggers the connector-measurement effect now that plotly's
    // graph div is initialised and ready to be queried.
    setPlotReadyVersion((v) => v + 1);
  };

  // Re-apply the tick filter on every chart re-render, and keep it
  // sticky against plotly's internal redraws (`watchXTicks`
  // MutationObserver re-applies on each tick-layer mutation).
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return undefined;
    const cleanups = [];
    slot
      .querySelectorAll('.js-plotly-plot, .plotly-graph-div')
      .forEach((div) => {
        applyStateYearTicks(div);
        cleanups.push(watchXTicks(div));
      });
    return () => cleanups.forEach((fn) => fn());
  }, [plotConfig]);

  // Recompute the dashed connectors that link each chart marker
  // to its title-card dot. Re-fires on: effect deps (picker /
  // chart re-render / plot-ready), ResizeObserver on the three
  // contributing boxes (chart slot, connector strip, columns
  // row), plotly's own redraw events, and a DOM-mutation backstop.
  // Multiple triggers are intentional — plotly's layout settles
  // asynchronously, so the first synchronous measure can run
  // before `_fullLayout` is populated.
  useEffect(() => {
    const slot = slotRef.current;
    const connector = connectorRef.current;
    if (!slot || !connector) return undefined;

    // Always defer the measure to the next animation frame so the
    // layout has fully settled — title cards reflow when columns
    // grow taller from new cards, and a synchronous measure inside
    // a ResizeObserver callback can capture the *previous* frame's
    // positions while React is still committing the new tile.
    let pendingRaf = null;
    const update = () => {
      if (pendingRaf != null) return;
      pendingRaf = requestAnimationFrame(() => {
        pendingRaf = null;
        setConnections(
          computeConnections(slot, connector, stateYearsRef.current),
        );
      });
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(slot);
    ro.observe(connector);
    const columnsRow = connector.nextElementSibling;
    if (columnsRow) ro.observe(columnsRow);

    const mo = new MutationObserver(update);
    const svg = slot.querySelector('svg.main-svg');
    if (svg)
      mo.observe(svg, { childList: true, subtree: true, attributes: true });
    // Adding/removing tiles in a column rewrites the grid's children
    // but doesn't always change the columns-row's outer size, so
    // ResizeObserver wouldn't fire. Watch the columns row's subtree
    // for any DOM mutation (`react-grid-layout` re-renders, tile
    // inserts) so we re-measure after every layout change.
    if (columnsRow)
      mo.observe(columnsRow, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style'],
      });

    const plotDiv = slot.querySelector('.js-plotly-plot, .plotly-graph-div');
    const plotEvents = ['plotly_relayout', 'plotly_redraw', 'plotly_afterplot'];
    if (plotDiv?.on) {
      plotEvents.forEach((evt) => plotDiv.on(evt, update));
    }

    return () => {
      if (pendingRaf != null) cancelAnimationFrame(pendingRaf);
      ro.disconnect();
      mo.disconnect();
      if (plotDiv?.removeListener) {
        plotEvents.forEach((evt) => plotDiv.removeListener(evt, update));
      }
    };
  }, [plotConfig, stateYears, plotReadyVersion]);

  /**
   * Open the standard plot-edit drawer with the current config. On
   * save, persist the user's parameter picks via the canvas store
   * (the next render reads them back through `plotConfig`). The
   * drawer's form scopes its choice generators to the parent
   * scenario via `scenarioOverride` so e.g. the available
   * `existing-pathway-names` list reflects the current scenario's
   * pathways.
   */
  const handleEdit = () => {
    if (!onOpenDrawer || !plotConfig) return;
    onOpenDrawer({
      plotConfig,
      scenarioOverride:
        project && parentScenario
          ? { project, scenarioName: parentScenario }
          : null,
      // Pin the pathway pick to the canvas dropdown (re-injected on
      // every render via `plotConfig`); a user-edit here would
      // silently desync the timeline from the rest of pathway-single.
      extraReadonlyFields: ['existing-pathway-names'],
      // The plot script is fixed; Back would let the user swap into
      // a different plot type and turn the card into something else.
      allowBack: false,
      onSave: (nextConfig) => setOverrideConfig(nextConfig),
    });
  };

  if (view !== 'pathway-single' || !plotConfig || !parentScenario) {
    return null;
  }

  return (
    <>
      <div style={cardStyle}>
        <div style={titleRowStyle}>
          <div style={titleLeftStyle}>
            <TimelineIcon style={titleIconStyle} aria-hidden />
            <span style={titleTextStyle}>Pathway Emission Timeline</span>
            {caption && (
              <>
                <span style={titleSeparatorStyle}>—</span>
                <span style={subtitleTextStyle} title={caption}>
                  {caption}
                </span>
              </>
            )}
          </div>
          {enableEdit && (
            <div className="cea-card-icon-button-container">
              <Tooltip title="Edit" placement="bottom">
                <Button
                  type="text"
                  icon={<InputEditorIcon />}
                  onClick={handleEdit}
                  disabled={!onOpenDrawer}
                  aria-label="Edit pathway emission timeline"
                />
              </Tooltip>
              <Tooltip title="Refit" placement="bottom">
                <Button
                  type="text"
                  icon={<RefreshIcon />}
                  onClick={handleRefit}
                  aria-label="Refit chart to its container"
                />
              </Tooltip>
              <Popconfirm
                title="Remove the pathway timeline?"
                description="This exits Pathway View."
                okText="Remove"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={startOver}
              >
                <Tooltip title="Delete card" placement="bottom">
                  <Button
                    type="text"
                    icon={<BinAnimationIcon style={{ color: ERROR_RED }} />}
                    aria-label="Delete pathway emission timeline"
                  />
                </Tooltip>
              </Popconfirm>
            </div>
          )}
        </div>
        <div
          ref={slotRef}
          className="cea-pathway-timeline-strip"
          style={chartAreaStyle}
        >
          <div style={chartFillStyle}>
            <CanvasPlot
              project={project}
              scenario={parentScenario}
              plotConfig={plotConfig}
              onCaption={setCaption}
              onPlotReady={handlePlotReady}
            />
          </div>
        </div>
      </div>
      <div ref={connectorRef} style={connectorStyle}>
        <svg style={connectorSvgStyle} overflow="visible">
          {connections.map((c, i) => {
            // One continuous polyline drawn entirely in this SVG
            // (the Plotly-shape markers were dropped because their
            // dash phase doesn't align with ours, leaving a visible
            // gap at the join). Segments:
            //   1. vertical from plot top → past x-axis (chart-side
            //      marker, overhanging into the bottom margin);
            //   2. cubic bezier with vertical tangents at both ends
            //      (Grasshopper-style wire) into the title card top;
            //   3. straight vertical from card top → dot inside the
            //      title card.
            const midY = (c.curveStartY + c.cardTopY) / 2;
            const d =
              `M ${c.x1} ${c.chartTopY} ` +
              `L ${c.x1} ${c.curveStartY} ` +
              `C ${c.x1} ${midY}, ${c.x2} ${midY}, ${c.x2} ${c.cardTopY} ` +
              `L ${c.x2} ${c.y2}`;
            return (
              <g key={i}>
                <path
                  d={d}
                  stroke="#000"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  fill="none"
                />
                <circle cx={c.x2} cy={c.y2} r={DOT_RADIUS_PX} fill="#000" />
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
};

const cardStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '8px 16px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  width: '100%',
  height: 360,
  overflow: 'hidden',
  // Bottom gap lives on `connectorStyle` so the dashed connector
  // SVG sits between the card and the columns row.
};

// The connector strip lives between the card and the columns row.
// `position: relative` anchors the SVG, which uses `overflow:
// visible` so dashed paths can extend slightly above (into the
// card's bottom area) and below (into the columns row's title
// row) without being clipped. `z-index` lifts the strip above the
// columns row that follows it in DOM order — without it, every
// title card paints over our dashed lines and dots, making them
// effectively invisible.
const connectorStyle = {
  position: 'relative',
  width: '100%',
  height: 12,
  marginBottom: 12,
  zIndex: 10,
};

const connectorSvgStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  overflow: 'visible',
  pointerEvents: 'none',
};

const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexShrink: 0,
};

const titleLeftStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

const titleIconStyle = {
  fontSize: 18,
  color: '#555',
  flexShrink: 0,
};

const titleTextStyle = {
  fontWeight: 700,
  fontSize: 14,
  color: '#222',
  flexShrink: 0,
};

const titleSeparatorStyle = {
  color: '#999',
  fontWeight: 400,
  flexShrink: 0,
};

const subtitleTextStyle = {
  fontWeight: 400,
  fontSize: 13,
  color: '#666',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
};

// `position: relative` anchor for the absolute-fill chart wrapper
// below. The absolute child takes the Plotly chart out of the
// canvas's intrinsic-size flow — without this, plotly's pixel width
// (set once by `fitPlotToParent` on first measure) leaks up the
// flex chain into the canvas's `fit-content` width and locks it at
// the widest measurement, so removing columns can't shrink the
// canvas (the chart never refits and stays oversized).
const chartAreaStyle = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  position: 'relative',
};

const chartFillStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
};

export default PathwayTimelineStrip;

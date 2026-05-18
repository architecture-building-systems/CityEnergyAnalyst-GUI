import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  cloneElement,
  isValidElement,
} from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import parser from 'html-react-parser';

import {
  CEA_PURPLE,
  BORDER_SUBTLE,
  ERROR_RED,
  SYSTEM_FONT_STACK,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from 'constants/theme';

import { useFetchCustomPlot } from '../hooks/useCanvasData';

/**
 * Renders a single Plotly plot. Every Canvas Builder plot has a
 * script, so we always fetch via POST /api/reports/plot-custom.
 *
 * Single render path: parse the HTML, replay the embedded <script>
 * tags inline, post-process the resulting Plotly figures (lift main
 * title, annotate per-figure subtitles, fit to container on resize).
 * Full-HTML responses (`to_html(full_html=True)` or backend-wrapped
 * `<!DOCTYPE html>…</html>`) are unwrapped to a fragment first so the
 * pipeline stays uniform.
 *
 * Charts whose legend is anchored *below* the plot area
 * (`legend.orientation === 'h'` with `y <= 0`, e.g. emission_timeline)
 * get the in-chart legend stripped out and re-rendered as a separate
 * React row beneath the chart — same Map / Legend split-section
 * pattern map cards use. The chart never has to fight Plotly's
 * negative-y legend anchor for room, and the React legend can wrap
 * freely without overlapping the plot or the x-axis labels.
 *
 * `onCaption(text)`       — main title lifted from the figure.
 * `onNaturalHeight(px)`   — fired with the figure's natural pixel
 *   height. Card uses it to auto-grow on first render.
 */
const CanvasPlot = ({
  scenario,
  plotConfig,
  onPlotReady,
  onCaption,
  onNaturalHeight,
}) => {
  const uniqueId = useId();
  const chartAreaRef = useRef(null);
  const scriptRef = useRef(null);
  const [legendItems, setLegendItems] = useState([]);

  // Stash the current callbacks in refs so the post-process effect
  // below can call them without listing them as deps. Parents
  // (FeatureCardPlot in particular) curry per-plot callbacks inline,
  // so a fresh function identity arrives on every parent render.
  // If those identities were dep-tracked, the effect would re-fire
  // on every parent re-render → postProcess would re-read each
  // figure's `layout.height` (which `fitPlotToParent` has since
  // overwritten with the wrapper's measured size) and re-report it
  // as the chart's natural height. The card grew, the wrapper
  // measured taller, the natural height climbed, the card grew
  // more — a feedback loop that ran the card off the bottom of the
  // page. Refs sever the dep chain so postProcess fires once per
  // html and the loop can't form.
  const onCaptionRef = useRef(onCaption);
  const onNaturalHeightRef = useRef(onNaturalHeight);
  const onPlotReadyRef = useRef(onPlotReady);
  useEffect(() => {
    onCaptionRef.current = onCaption;
    onNaturalHeightRef.current = onNaturalHeight;
    onPlotReadyRef.current = onPlotReady;
  });

  const {
    data: rawHtml,
    isLoading,
    error,
  } = useFetchCustomPlot(plotConfig, scenario);

  // Backend full-HTML responses embed the chart inside a real <body>
  // alongside the CDN script tags and inline `Plotly.newPlot` blocks.
  // Unwrapping body gives us a fragment shaped exactly like
  // `to_html(full_html=False)` — the render path below handles both
  // shapes uniformly. We then rewrite the figure's UUID-style div
  // IDs (in both the markup and the inline `Plotly.newPlot` calls)
  // with a per-instance suffix: react-query hands the same HTML to
  // every card configured the same way, so without this rewrite two
  // cards share the same `id`, `getElementById` always returns the
  // first one, and the second card never gets a chart attached.
  // `useId()` returns React's stable per-instance id (`:r0:`,
  // `:r1:`…); strip the colons so the result is safe as an HTML id
  // suffix without escaping.
  const idSuffix = useMemo(
    () => uniqueId.replace(/[^a-zA-Z0-9]/g, ''),
    [uniqueId],
  );
  const html = useMemo(
    () => uniquifyPlotIds(unwrapBody(rawHtml), idSuffix),
    [rawHtml, idSuffix],
  );

  useEffect(() => {
    if (!html) return;

    const externalSrcs = [];
    const inlineScripts = [];
    parser(html, {
      replace: function (domNode) {
        if (domNode.type !== 'script') return;
        const src = domNode.attribs?.src;
        if (src) externalSrcs.push(src);
        else if (domNode.children?.[0]?.data)
          inlineScripts.push(domNode.children[0].data);
      },
    });

    let cancelled = false;
    let settleTimer = null;

    const loadExternal = (src) =>
      new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const el = document.createElement('script');
        el.src = src;
        el.async = false;
        el.onload = resolve;
        el.onerror = resolve;
        document.head.appendChild(el);
      });

    const runInline = () => {
      if (cancelled) return;
      scriptRef.current = inlineScripts.map((src, idx) => {
        const el = document.createElement('script');
        el.dataset.id = `script-report-${uniqueId}-${idx}`;
        el.append(src);
        document.body.appendChild(el);
        return el;
      });
    };

    const run = async () => {
      for (const src of externalSrcs) {
        await loadExternal(src);
        if (cancelled) return;
      }
      runInline();
      // Plotly.newPlot resolves asynchronously; wait one tick before
      // touching the figure so `.layout` and `.data` are populated.
      setTimeout(() => postProcess(), POST_NEWPLOT_DELAY_MS);
    };

    const postProcess = () => {
      if (cancelled || !chartAreaRef.current) return;
      const plotDivs = chartAreaRef.current.querySelectorAll(
        '.js-plotly-plot, .plotly-graph-div',
      );
      if (plotDivs.length === 0) return;

      const isSingleFigure = plotDivs.length === 1;
      const stripLegend = hasExternalBottomLegend(plotDivs[0].layout);

      // Lift the main title onto the slot caption regardless of how
      // many figures share this response — every figure has the same
      // main title; only the subtitle (what-if-name) varies.
      const { main: mainTitle } = splitFigureTitle(
        plotDivs[0].layout?.title?.text,
      );
      onCaptionRef.current?.(mainTitle);

      if (stripLegend) {
        const items = extractLegendItems(plotDivs[0].data);
        if (items.length > 0) setLegendItems(items);
      }

      plotDivs.forEach((div) => {
        try {
          window.Plotly?.relayout?.(
            div,
            relayoutUpdate({
              stripLegend,
              isSingleFigure,
              rawTitle: div.layout?.title?.text,
            }),
          );
        } catch {
          // Error-card HTML snippets aren't Plotly figures — skip.
        }
      });

      // Sum natural heights so the parent card can auto-grow. Multi-
      // figure plots return several figures with backend-baked
      // `layout.height`; autosize plots have none and fall back to a
      // generous default so the card has room for plot + legend.
      let naturalHeight = 0;
      plotDivs.forEach((div) => {
        const h = div.layout?.height;
        if (typeof h === 'number') naturalHeight += h;
        else if (stripLegend) naturalHeight += STRIPPED_DEFAULT_HEIGHT;
      });
      // Some plots (comfort_chart) embed extra HTML beneath each
      // figure — academic tables, captions — that the chart's own
      // `layout.height` doesn't account for. Take the larger of
      // the layout-sum and the chart-area's measured scrollHeight
      // so trailing content stays inside the card.
      const measured = chartAreaRef.current?.scrollHeight ?? 0;
      naturalHeight = Math.max(naturalHeight, measured);
      if (naturalHeight > 0) onNaturalHeightRef.current?.(naturalHeight);

      // Schedule one explicit refit a moment later. By then React
      // has committed the natural-height state update, react-grid-
      // layout has applied the new card pixel height, and the flex
      // chain has propagated to each chart wrapper. Plotly's RO
      // would normally fire too, but its initial fire at mount can
      // coalesce with the auto-grow change and get swallowed by the
      // first-fire skip — this guarantees one fit that lands at
      // the post-grow wrapper size regardless of RO timing.
      settleTimer = setTimeout(() => {
        if (cancelled || !chartAreaRef.current) return;
        refitCharts(chartAreaRef.current);
      }, AUTO_GROW_SETTLE_MS);

      onPlotReadyRef.current?.(plotDivs[0]);
    };

    run();

    return () => {
      cancelled = true;
      clearTimeout(settleTimer);
      scriptRef.current?.forEach((el) => el.remove());
      scriptRef.current = null;
    };
  }, [html, uniqueId]);

  // Re-fit on chart-area resize. The activation timer gates RO
  // fires until after the auto-grow has settled — without it, a
  // coalesced first fire can carry the post-auto-grow size change
  // and we'd have to choose between fitting before the chart is
  // ready or skipping the only relevant fire. With it, RO is just
  // a "user dragged the card" listener; the auto-grow path is
  // handled by the explicit refit scheduled in postProcess.
  useEffect(() => {
    const area = chartAreaRef.current;
    if (!area || typeof ResizeObserver === 'undefined') return;
    let active = false;
    const activateTimer = setTimeout(() => {
      active = true;
    }, AUTO_GROW_SETTLE_MS);
    const ro = new ResizeObserver(() => {
      if (!active) return;
      refitCharts(area);
    });
    ro.observe(area);
    return () => {
      clearTimeout(activateTimer);
      ro.disconnect();
    };
  }, [html]);

  if (isLoading) {
    return (
      <div style={loadingStyle}>
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
          tip="Loading plot..."
        >
          <div style={{ height: 300 }} />
        </Spin>
      </div>
    );
  }

  if (error) return <PlotError error={error} scenario={scenario} />;

  if (!html) return null;

  const content = parser(html, {
    replace: function (domNode) {
      if (domNode.type === 'script') return <></>;
    },
  });

  // The backend wraps each plotly-graph-div in an unstyled outer div.
  // Force every wrapper to `flex: 1 / minHeight: 0` so single-figure
  // plots fill the chart area and multi-figure plots share it
  // equally; either way each chart's parent has a real pixel height
  // that fitPlotToParent reads on user resize.
  const filtered = (Array.isArray(content) ? content : [content])
    .filter((node) => node?.type === 'div' || node?.type === 'style')
    .map((node, i) =>
      isValidElement(node) && node.type === 'div'
        ? cloneElement(node, {
            key: node.key ?? i,
            style: {
              ...(node.props.style || {}),
              ...chartWrapperStyle,
            },
          })
        : node,
    );

  return (
    <div style={containerStyle}>
      <div ref={chartAreaRef} style={chartAreaStyle}>
        {filtered}
      </div>
      {legendItems.length > 0 && <PlotLegend items={legendItems} />}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────

// Rewrite every `<div id="UUID" class="plotly-graph-div">` (and the
// matching `Plotly.newPlot("UUID", …)` call inside the inline
// script) so two cards rendering the *same* cached backend HTML
// don't both emit a div with the same id. `getElementById` returns
// only the first match, so without this rewrite the second card's
// chart silently never gets attached.
function uniquifyPlotIds(html, suffix) {
  if (!html || !suffix) return html;
  const ids = new Set();
  // Match a plotly-graph-div regardless of attribute order — `id`
  // can come before or after `class`.
  const re =
    /<div\b[^>]*\bclass="[^"]*\bplotly-graph-div\b[^"]*"[^>]*\bid="([^"]+)"|<div\b[^>]*\bid="([^"]+)"[^>]*\bclass="[^"]*\bplotly-graph-div\b[^"]*"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1] || m[2];
    if (id) ids.add(id);
  }
  if (ids.size === 0) return html;
  let result = html;
  for (const id of ids) {
    // Plotly uses UUID-shaped ids — no regex specials — but escape
    // defensively so any future format change can't break us.
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(safe, 'g'), `${id}-${suffix}`);
  }
  return result;
}

// Strip <html>/<body> wrapping if present so the render path sees the
// same fragment shape regardless of `to_html(full_html=…)`.
function unwrapBody(html) {
  if (!html) return html;
  const head = html.slice(0, 200);
  const isFull = /<!doctype/i.test(head) || /<html[\s>]/i.test(head);
  if (!isFull) return html;
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1] : html;
}

// True when the chart anchors a horizontal legend beneath the plot
// area AND reserves bottom margin for it. The margin check matters:
// many ordinary bar plots also default to a horizontal bottom legend
// without inflating `margin.b`, and they render fine in their own
// chrome — only plots that explicitly bake extra bottom space (like
// emission_timeline's `margin.b: 200`) signal "this legend needs to
// live outside the plot area to fit". `DEFAULT_PLOTLY_BOTTOM_MARGIN`
// is the documented Plotly default; anything above means the backend
// reserved space deliberately.
function hasExternalBottomLegend(layout) {
  if (!layout || layout.showlegend === false) return false;
  const legend = layout.legend;
  if (!legend || legend.orientation !== 'h') return false;
  // `legend.y <= 0` means the legend is anchored below the plot
  // area (Plotly normalises plot-area coords so 0 is the bottom).
  // If `y` is unset, Plotly defaults to a top-right placement —
  // not below — so we treat that as no external legend.
  if (typeof legend.y !== 'number' || legend.y > 0) return false;
  const bottomMargin = layout.margin?.b ?? DEFAULT_PLOTLY_BOTTOM_MARGIN;
  return bottomMargin > DEFAULT_PLOTLY_BOTTOM_MARGIN;
}

// Build the `Plotly.relayout` payload for a single figure. Three
// cases — legend stripped (any figure count), single figure with
// in-chart legend, or one of several figures stacked together.
function relayoutUpdate({ stripLegend, isSingleFigure, rawTitle }) {
  if (stripLegend) {
    return {
      'title.text': isSingleFigure ? '' : pickWhatIfName(rawTitle),
      ...SUBTITLE_FONT_UPDATE,
      showlegend: false,
      // Reset the legend's negative-y anchor (e.g. emission_timeline
      // sets `legend.y: -0.2` to push it below the plot area). Even
      // with `showlegend: false`, a negative anchor can still reserve
      // bottom space, squeezing the x-axis title against the tick
      // labels.
      'legend.y': 0,
      'margin.t': isSingleFigure ? STRIPPED_MARGIN.t : SUBTITLE_MARGIN.t,
      'margin.l': STRIPPED_MARGIN.l,
      'margin.r': STRIPPED_MARGIN.r,
      'margin.b': STRIPPED_MARGIN.b,
      // Pin axis margins so Plotly's `automargin` heuristic can't
      // expand them past the values we set above when the labels
      // happen to be wide — that's how we'd end up with stray
      // whitespace between the chart and the React legend, or to
      // the left of the y-axis.
      'xaxis.automargin': false,
      'yaxis.automargin': false,
    };
  }
  if (isSingleFigure) {
    return {
      'title.text': '',
      'margin.t': TIGHT_MARGIN.t,
      'margin.l': TIGHT_MARGIN.l,
      'margin.r': TIGHT_MARGIN.r,
    };
  }
  return {
    'title.text': pickWhatIfName(rawTitle),
    ...SUBTITLE_FONT_UPDATE,
    'margin.t': SUBTITLE_MARGIN.t,
    'margin.l': SUBTITLE_MARGIN.l,
    'margin.r': SUBTITLE_MARGIN.r,
  };
}

// Pull a name + colour pair out of each visible Plotly trace. Bar /
// line / scatter all keep their colour at predictable spots —
// `marker.color`, `line.color`, or `fillcolor`. Per-bar colour arrays
// collapse to the first entry, which matches stacked-bar timeline
// plots whose traces use one colour each. Multi-figure responses
// repeat the same set of trace names per figure; we dedupe by name
// so the legend lists each category once.
function extractLegendItems(traces) {
  if (!Array.isArray(traces)) return [];
  const seen = new Set();
  const items = [];
  for (const t of traces) {
    if (!t || t.showlegend === false || !t.name || seen.has(t.name)) continue;
    seen.add(t.name);
    items.push({ name: t.name, color: pickTraceColor(t) });
  }
  return items;
}

function pickTraceColor(trace) {
  const candidates = [trace.marker?.color, trace.line?.color, trace.fillcolor];
  for (const c of candidates) {
    if (typeof c === 'string') return c;
    if (Array.isArray(c) && typeof c[0] === 'string') return c[0];
  }
  return null;
}

// Extract the what-if-name from a per-figure subtitle. The backend
// formats the subtitle as `Scenario | WhatIfName` (or longer pipe-
// delimited context), with the name as the last segment. Reading
// from each figure's own metadata rather than a positional lookup
// against the input array guarantees the label matches the chart
// even if the backend reorders figures in its response.
function pickWhatIfName(rawTitle) {
  const { sub } = splitFigureTitle(rawTitle);
  if (!sub) return '';
  return sub.includes('|') ? sub.split('|').pop().trim() : sub;
}

// Split a Plotly figure title into its main + subtitle plain-text
// parts. The backend embeds the structure as
// `<b>MainTitle</b><br><sub>…subtitle…</sub>`.
function splitFigureTitle(raw) {
  const text = raw || '';
  const parts = text.split(/<br\s*\/?>/i);
  const stripHtml = (s) => s.replace(/<[^>]+>/g, '').trim();
  return {
    main: stripHtml(parts[0] || ''),
    sub: stripHtml(parts.slice(1).join(' ')),
  };
}

// Refit every Plotly chart inside a container element. Skips charts
// that haven't been initialised yet (no `_fullLayout`) — fast renders
// from a cached Plotly CDN can have RO fire before `newPlot`'s
// promise resolves.
function refitCharts(area) {
  area.querySelectorAll('.js-plotly-plot, .plotly-graph-div').forEach((div) => {
    if (!div._fullLayout) return;
    fitPlotToParent(div);
  });
}

// Resize a Plotly figure to its parent container. Three steps in
// order: clear the inline width/height that newPlot wrote (so
// Plotly is free to replace them), `relayout` the layout's dims to
// the wrapper's measured size, then `Plots.resize` to commit the
// redraw — Sankey and other fixed-dim traces cache pixel geometry
// during newPlot and only re-flow when both calls happen together.
export function fitPlotToParent(div) {
  const parent = div?.parentElement;
  if (!parent) return;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  if (w <= 0 || h <= 0) return;
  div.style.height = '';
  div.style.width = '';
  try {
    window.Plotly?.relayout?.(div, { width: w, height: h });
    window.Plotly?.Plots?.resize?.(div);
  } catch {
    // Error-card HTML snippets aren't Plotly figures — skip.
  }
}

// ── Sub-components ───────────────────────────────────────────────

const PlotLegend = ({ items }) => (
  <div style={legendRowStyle}>
    {items.map((item, i) => (
      <div key={`${item.name}-${i}`} style={legendItemStyle}>
        <span
          style={{
            ...legendSwatchStyle,
            background: item.color || LEGEND_FALLBACK_COLOR,
          }}
        />
        <span style={legendLabelStyle}>{item.name}</span>
      </div>
    ))}
  </div>
);

// Mirrors `FeatureCardMap`'s error overlay style — calm white card,
// 3px red left accent, no bold heading. Most plot errors in
// practice come from the upstream tool not having run for the
// scenario; we surface that hint for both 404 and 500-without-
// detail (backend exceptions on missing inputs typically lack a
// useful detail string). Genuine technical errors fall through to
// "Failed to load plot" with the server detail / JS message.
const PlotError = ({ error, scenario }) => {
  const detail = error?.response?.data?.detail;
  const serverMessage =
    (typeof detail === 'string' && detail.trim()) || detail?.message || null;
  const status = error?.response?.status;
  const fallback = error?.message;

  const isMissingData =
    status === 404 || (status >= 500 && status < 600 && !serverMessage);

  return (
    <div style={errorStyle}>
      <div style={errorCardStyle}>
        {isMissingData ? (
          <>
            <div style={errorTitleStyle}>
              No plot data for{' '}
              <span style={{ color: CEA_PURPLE }}>{scenario}</span>
            </div>
            <div style={errorBodyStyle}>
              Run the upstream tool for this scenario first.
            </div>
          </>
        ) : (
          <>
            <div style={errorTitleStyle}>Failed to load plot</div>
            {(serverMessage || fallback) && (
              <div style={errorDetailStyle}>{serverMessage || fallback}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Constants ────────────────────────────────────────────────────

// Plotly's documented default for `layout.margin.b` (px). Plots that
// reserve more bottom space than this have explicitly tuned their
// layout for a bottom-anchored horizontal legend — that's the signal
// the external React legend should take over.
// https://plotly.com/javascript/reference/layout/#layout-margin
const DEFAULT_PLOTLY_BOTTOM_MARGIN = 80;

// One-tick wait after `Plotly.newPlot` so `.layout` and `.data` are
// readable. 200ms covers the slowest figures (large Sankeys) without
// being noticeably slow on simple bar/line plots.
const POST_NEWPLOT_DELAY_MS = 200;

// How long to wait after postProcess before treating subsequent
// resize-observer fires as "user dragged the card". Spans the
// React state commit → react-grid-layout pixel-height update →
// flex-tree settle that the auto-grow path goes through. The
// explicit refit at this moment guarantees the chart matches its
// final wrapper size.
const AUTO_GROW_SETTLE_MS = 100;

// Default height for autosize figures whose legend has been stripped.
// Picked to give the plot area room to breathe alongside the React
// legend row beneath; the card auto-grows to fit and the user can
// drag-resize from there.
const STRIPPED_DEFAULT_HEIGHT = 500;

// Swatch colour shown next to a legend entry whose Plotly trace
// didn't expose a colour we could read (rare — most charts wire
// `marker.color` / `line.color` / `fillcolor`). Neutral grey so it
// reads as "unknown" rather than introducing a meaningful hue.
const LEGEND_FALLBACK_COLOR = '#888';

// Margins applied to figures with stripped legends — title is lifted
// to the slot caption (or replaced with a subtitle) and axis titles
// are dropped at the backend, so the plot area can fill the wrapper
// end-to-end with just enough room for tick labels. With `automargin`
// pinned off Plotly won't tune this for us, so we reserve enough by
// hand: `l: 40` fits short y-axis numeric ticks (`0`, `20M`, `60M`),
// `b: 80` (Plotly's own default) fits 6-character rotated year ticks
// like `Y_2000` without clipping the last digit.
const STRIPPED_MARGIN = { t: 16, l: 40, r: 16, b: 80 };

// Margins applied to single-figure plots whose title is lifted to
// the slot caption — the in-chart title is empty so almost no top
// margin is needed.
const TIGHT_MARGIN = { t: 16, l: 20, r: 16 };

// Margins applied to figures that keep an in-chart subtitle (multi-
// figure plots, where each figure shows its own what-if-name).
const SUBTITLE_MARGIN = { t: 28, l: 20, r: 16 };

// In-chart subtitle styling. Font size + colour match the secondary
// title row in `PlotSlotCard` so a stripped chart and a non-stripped
// chart share visual weight.
const SUBTITLE_FONT_UPDATE = {
  'title.font.size': 12,
  'title.font.color': '#666',
  'title.x': 0,
  'title.xanchor': 'left',
};

// ── Styles ───────────────────────────────────────────────────────

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  width: '100%',
  position: 'relative',
};

const chartAreaStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  width: '100%',
  gap: 12,
};

const chartWrapperStyle = {
  width: '100%',
  flex: '1 1 0',
  minHeight: 0,
  position: 'relative',
};

const legendRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px 16px',
  paddingTop: 12,
  fontSize: 12,
  color: '#444',
  lineHeight: 1.4,
};

const legendItemStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const legendSwatchStyle = {
  display: 'inline-block',
  width: 12,
  height: 12,
  borderRadius: 2,
  flexShrink: 0,
};

const legendLabelStyle = {
  whiteSpace: 'nowrap',
};

const loadingStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 300,
};

const errorStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200,
  padding: 24,
};

const errorCardStyle = {
  maxWidth: 320,
  padding: '12px 14px',
  border: `1px solid ${BORDER_SUBTLE}`,
  borderLeft: `3px solid ${ERROR_RED}`,
  borderRadius: 8,
  background: '#fff',
  fontFamily: SYSTEM_FONT_STACK,
};

const errorTitleStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: TEXT_PRIMARY,
  marginBottom: 4,
};

const errorBodyStyle = {
  fontSize: 12,
  color: TEXT_SECONDARY,
};

const errorDetailStyle = {
  marginTop: 6,
  fontSize: 11,
  color: TEXT_SECONDARY,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

export default CanvasPlot;

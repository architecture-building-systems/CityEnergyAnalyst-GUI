import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  cloneElement,
  isValidElement,
} from 'react';
import { Spin, Empty } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import parser from 'html-react-parser';

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
  const containerRef = useRef(null);
  const scriptRef = useRef(null);
  const [legendItems, setLegendItems] = useState([]);

  const {
    data: rawHtml,
    isLoading,
    error,
  } = useFetchCustomPlot(plotConfig, scenario);

  // Backend full-HTML responses embed the chart inside a real <body>
  // alongside the CDN script tags and inline `Plotly.newPlot` blocks.
  // Unwrapping body gives us a fragment shaped exactly like
  // `to_html(full_html=False)` — the render path below handles both
  // shapes uniformly.
  const html = useMemo(() => unwrapBody(rawHtml), [rawHtml]);

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
      if (cancelled || !containerRef.current) return;
      const plotDivs = containerRef.current.querySelectorAll(
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
      onCaption?.(mainTitle);

      if (stripLegend) {
        const items = extractLegendItems(plotDivs[0].data);
        if (items.length > 0) setLegendItems(items);
      }

      if (window.Plotly?.relayout) {
        plotDivs.forEach((div) => {
          try {
            window.Plotly.relayout(
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
      }

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
      if (naturalHeight > 0) onNaturalHeight?.(naturalHeight);

      onPlotReady?.(plotDivs[0]);
    };

    run();

    return () => {
      cancelled = true;
      scriptRef.current?.forEach((el) => el.remove());
      scriptRef.current = null;
    };
  }, [html, uniqueId, onPlotReady, onCaption, onNaturalHeight]);

  // Re-fit on container resize (user drag-resize). Skip the first
  // fire — fitting on initial mount would crush figures with backend-
  // baked dimensions before the auto-grow request lands.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    let initialFire = true;
    const ro = new ResizeObserver(() => {
      if (initialFire) {
        initialFire = false;
        return;
      }
      container
        .querySelectorAll('.js-plotly-plot, .plotly-graph-div')
        .forEach((div) => fitPlotToParent(div));
    });
    ro.observe(container);
    return () => ro.disconnect();
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

  if (error) return <PlotError error={error} />;

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
    <div ref={containerRef} style={containerStyle}>
      <div style={chartAreaStyle}>{filtered}</div>
      {legendItems.length > 0 && <PlotLegend items={legendItems} />}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────

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

// True when the chart anchors its legend horizontally beneath the
// plot area. Such legends rely on the figure being tall enough for
// the reserved bottom margin to fit them; in an embedded card that's
// not guaranteed, so we strip them and render externally instead.
function hasExternalBottomLegend(layout) {
  if (!layout || layout.showlegend === false) return false;
  const legend = layout.legend;
  if (!legend) return false;
  return legend.orientation === 'h' && (legend.y ?? 1) <= 0;
}

// Build the `Plotly.relayout` payload for a single figure. Three
// cases — legend stripped (any figure count), single figure with
// in-chart legend, or one of several figures stacked together.
function relayoutUpdate({ stripLegend, isSingleFigure, rawTitle }) {
  if (stripLegend) {
    return {
      'title.text': isSingleFigure ? '' : pickWhatIfName(rawTitle),
      ...subtitleFontUpdate,
      showlegend: false,
      'margin.t': isSingleFigure ? STRIPPED_MARGIN.t : SUBTITLE_MARGIN.t,
      'margin.l': STRIPPED_MARGIN.l,
      'margin.r': STRIPPED_MARGIN.r,
      'margin.b': STRIPPED_MARGIN.b,
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
    ...subtitleFontUpdate,
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

// Resize a Plotly figure to its parent container. Clears inline
// width/height first (so Plotly can replace them) then writes the
// measured dims via relayout, which re-flows traces (Sankey,
// parallel-coords…) that cache pixel geometry from newPlot.
function fitPlotToParent(div) {
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
          style={{ ...legendSwatchStyle, background: item.color || '#888' }}
        />
        <span style={legendLabelStyle}>{item.name}</span>
      </div>
    ))}
  </div>
);

const PlotError = ({ error }) => {
  const detail = error?.response?.data?.detail;
  const serverMessage =
    (typeof detail === 'string' && detail.trim()) || detail?.message || null;
  const status = error?.response?.status;

  if (status === 404) {
    return (
      <div style={errorStyle}>
        <Empty
          description={
            serverMessage ||
            'This plot has no data yet. Run the feature for this scenario first.'
          }
        />
      </div>
    );
  }
  return (
    <div style={errorStyle}>
      <Empty
        description={
          <>
            <div>Failed to load plot.</div>
            {serverMessage && (
              <div style={errorDetailStyle}>{serverMessage}</div>
            )}
            {!serverMessage && error?.message && (
              <div style={errorDetailStyle}>{error.message}</div>
            )}
          </>
        }
      />
    </div>
  );
};

// ── Constants ────────────────────────────────────────────────────

// One-tick wait after `Plotly.newPlot` so `.layout` and `.data` are
// readable. 200ms covers the slowest figures (large Sankeys) without
// being noticeably slow on simple bar/line plots.
const POST_NEWPLOT_DELAY_MS = 200;

// Default height for autosize figures whose legend has been stripped.
// Picked to give the plot area room to breathe alongside the React
// legend row beneath; the card auto-grows to fit and the user can
// drag-resize from there.
const STRIPPED_DEFAULT_HEIGHT = 500;

// Margins applied to figures with stripped legends — title is lifted
// to the slot caption (or replaced with a subtitle), so the plot
// area can fill the wrapper end-to-end with just enough room for
// axis labels.
const STRIPPED_MARGIN = { t: 16, l: 60, r: 16, b: 50 };

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
const subtitleFontUpdate = {
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

const errorDetailStyle = {
  marginTop: 6,
  fontSize: 12,
  color: '#666',
  whiteSpace: 'pre-wrap',
};

export default CanvasPlot;

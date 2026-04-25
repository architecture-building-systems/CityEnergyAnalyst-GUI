import { useEffect, useRef, useId, cloneElement, isValidElement } from 'react';
import { Spin, Empty } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import parser from 'html-react-parser';

import { useFetchCustomPlot } from '../hooks/useReportsData';

/**
 * Renders a single Plotly plot. Every Reports plot has a script, so
 * we always fetch via POST /api/reports/plot-custom.
 *
 * `onCaption(text)`       — main title lifted from the figure.
 * `onNaturalHeight(px)`   — fired after newPlot with the figure's
 *   backend-baked pixel height (e.g. 600 for Sankey). The card uses
 *   it to auto-grow on first render; subsequent user-driven resizes
 *   flow back through the ResizeObserver below.
 */
const ReportPlot = ({
  scenario,
  plotConfig,
  onPlotReady,
  onCaption,
  onNaturalHeight,
}) => {
  const uniqueId = useId();
  const containerRef = useRef(null);
  const scriptRef = useRef(null);

  const {
    data: html,
    isLoading,
    error,
  } = useFetchCustomPlot(plotConfig, scenario);

  useEffect(() => {
    if (!html) return;

    // The backend HTML contains both external CDN <script src=...>
    // tags and an inline Plotly.newPlot(...) script. html-react-parser
    // doesn't execute either, so we replay them here. The inline
    // script needs window.Plotly, so externals must load first.
    const externalSrcs = [];
    let inlineScript = null;
    parser(html, {
      replace: function (domNode) {
        if (domNode.type !== 'script') return;
        const src = domNode.attribs?.src;
        if (src) {
          externalSrcs.push(src);
        } else if (domNode.children?.[0]?.data) {
          inlineScript = domNode.children[0].data;
        }
      },
    });

    const appendedScripts = [];
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
        appendedScripts.push(el);
      });

    const runInline = () => {
      if (cancelled || !inlineScript) return;
      const el = document.createElement('script');
      el.dataset.id = `script-report-${uniqueId}`;
      el.append(inlineScript);
      document.body.appendChild(el);
      appendedScripts.push(el);
      scriptRef.current = el;
    };

    const run = async () => {
      for (const src of externalSrcs) {
        await loadExternal(src);
        if (cancelled) return;
      }
      runInline();
      // After newPlot, lift the main title out of the figure (the
      // backend embeds `<b>Title</b><br><sub>Subtitle</sub>`) and
      // blank the in-chart title — Reports surfaces it as a caption
      // above the plot via `onCaption` instead.
      setTimeout(() => {
        if (cancelled || !containerRef.current) return;
        const plotDivs = containerRef.current.querySelectorAll(
          '.js-plotly-plot, .plotly-graph-div',
        );
        if (plotDivs.length === 0) return;

        const firstRaw = plotDivs[0].layout?.title?.text || '';
        // Split on the `<br>` that separates title from subtitle,
        // then strip any HTML (`<b>`, `<sub>`, …) to get plain text.
        const mainPart = firstRaw.split(/<br\s*\/?>/i)[0];
        const plainText = mainPart.replace(/<[^>]+>/g, '').trim();
        if (plainText && onCaption) onCaption(plainText);

        // Tighten margins now that the title block is gone. Bottom
        // margin stays default so angled x-axis ticks don't clip.
        // No fitPlotToParent here — we want the chart at its natural
        // size on first paint so the card can auto-grow to fit it.
        if (window.Plotly?.relayout) {
          plotDivs.forEach((div) => {
            try {
              window.Plotly.relayout(div, {
                'title.text': '',
                'margin.t': 16,
                'margin.l': 20,
                'margin.r': 16,
              });
            } catch {
              // Error-card HTML snippets aren't Plotly figures — skip.
            }
          });
        }

        // Report the backend-baked natural height (e.g. 600 for
        // Sankey via `update_layout(height=N, autosize=False)`) so
        // the card can grow to fit. Charts with no explicit height
        // report nothing and autosize to the card on next render.
        const layoutHeight = plotDivs[0].layout?.height;
        if (typeof layoutHeight === 'number' && onNaturalHeight) {
          onNaturalHeight(layoutHeight);
        }

        if (onPlotReady) onPlotReady(plotDivs[0]);
      }, 200);
    };

    run();

    // Only the inline exec tag is removed on unmount; CDN tags are
    // left in <head> so subsequent plots reuse them.
    return () => {
      cancelled = true;
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
    };
  }, [html, uniqueId, onPlotReady]);

  // Re-fit on container resize (user drag-resizing the card). The
  // first RO fire is skipped — fitting on initial mount would crush
  // figures with backend-baked dimensions (Sankey…) before the
  // auto-grow request has a chance to land.
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

  if (error) {
    const detail = error?.response?.data?.detail;
    const serverMessage =
      (typeof detail === 'string' && detail.trim()) || detail?.message || null;
    const status = error?.response?.status;

    // 404 = the scenario hasn't been run yet — a user-recoverable
    // state, not a backend failure. Present it separately.
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
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: '#666',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {serverMessage}
                </div>
              )}
              {!serverMessage && error?.message && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
                  {error.message}
                </div>
              )}
            </>
          }
        />
      </div>
    );
  }

  if (!html) return null;

  // Render the HTML content; <script> tags are replayed in useEffect.
  const content = parser(html, {
    replace: function (domNode) {
      if (domNode.type === 'script') return <></>;
    },
  });

  // The backend HTML wraps the plotly-graph-div in an unstyled outer
  // div. Force it to 100% height so the inner `height: 100%` has
  // something to resolve against (width works because block elements
  // fill their parent by default; height does not).
  const filtered = (Array.isArray(content) ? content : [content])
    .filter((node) => node?.type === 'div' || node?.type === 'style')
    .map((node, i) =>
      isValidElement(node) && node.type === 'div'
        ? cloneElement(node, {
            key: node.key ?? i,
            style: {
              ...(node.props.style || {}),
              height: '100%',
              width: '100%',
            },
          })
        : node,
    );

  // `minHeight: 0` lets multiple plots in the same card divide space
  // proportionally via `flex: 1` — without it, each plot's natural
  // height would floor the share it gets when the card is resized.
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        position: 'relative',
      }}
    >
      {filtered}
    </div>
  );
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

// Resize a Plotly figure to its parent container. Clears inline
// width/height first (so Plotly can replace them) then writes the
// measured dims via `relayout`, which re-flows traces (Sankey,
// parallel-coords…) that cache pixel geometry from `newPlot`.
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

export default ReportPlot;

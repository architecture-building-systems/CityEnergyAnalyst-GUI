import { useEffect, useRef, useId, cloneElement, isValidElement } from 'react';
import { Spin, Empty } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import parser from 'html-react-parser';

import { useFetchReportPlot, useFetchCustomPlot } from '../hooks/useReportsData';

/**
 * Renders a single Plotly plot for a report column.
 *
 * Two modes:
 *   - Default: fetches via GET /api/reports/plot (feature-based)
 *   - Custom:  fetches via POST /api/reports/plot-custom (plotConfig with script/parameters)
 */
const ReportPlot = ({ project, scenario, feature, whatif, plotConfig, onPlotReady }) => {
  const uniqueId = useId();
  const containerRef = useRef(null);
  const scriptRef = useRef(null);

  const isCustom = !!plotConfig?.script;

  const defaultQuery = useFetchReportPlot(
    project,
    isCustom ? null : scenario,
    isCustom ? null : feature,
    isCustom ? null : whatif,
  );

  const customQuery = useFetchCustomPlot(
    isCustom ? plotConfig : null,
    isCustom ? scenario : null,
  );

  const { data: html, isLoading, error } = isCustom ? customQuery : defaultQuery;

  useEffect(() => {
    if (!html) return;

    // The backend HTML contains both external CDN scripts
    // (`<script src="https://cdn.plot.ly/...">`) AND an inline
    // `Plotly.newPlot(...)` script. `html-react-parser` doesn't
    // execute either when it renders divs, so we replay them here.
    // The inline script needs `window.Plotly`, so external scripts
    // must load first.
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
        // Reuse an already-loaded CDN tag so we don't double-load
        // (e.g. when multiple plots render from the same library).
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
      if (onPlotReady && containerRef.current) {
        setTimeout(() => {
          if (cancelled) return;
          const plotDiv = containerRef.current?.querySelector(
            '.plotly-graph-div, .js-plotly-plot',
          );
          if (plotDiv) onPlotReady(plotDiv);
        }, 200);
      }
    };

    run();

    return () => {
      cancelled = true;
      // Only remove the inline exec tag — leave the CDN tag cached
      // for subsequent plots.
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
    };
  }, [html, uniqueId, onPlotReady]);

  // Follow container size changes (card drag-resize) — Plotly uses
  // the div's pixel size at `newPlot` time, so we have to tell it
  // to re-measure explicitly. `Plots.resize` is a no-op if Plotly
  // hasn't initialised the div yet, so it's safe to call eagerly.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const plotDiv = container.querySelector(
        '.js-plotly-plot, .plotly-graph-div',
      );
      if (plotDiv && window.Plotly?.Plots?.resize) {
        window.Plotly.Plots.resize(plotDiv);
      }
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
      (typeof detail === 'string' && detail.trim()) ||
      detail?.message ||
      null;
    const status = error?.response?.status;

    // 404 = the scenario is missing the input/result files this plot
    // needs. That's a user-recoverable "please run the feature first"
    // situation, not a backend failure, so present it separately.
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

  // Parse and render the HTML content (excluding scripts)
  const content = parser(html, {
    replace: function (domNode) {
      // Remove script tags — they're handled via useEffect
      if (domNode.type === 'script') {
        return <></>;
      }
    },
  });

  // Filter to only div and style elements, and force the wrapper
  // div(s) to 100% height. The backend returns `<div><div class=
  // "plotly-graph-div" style="height:100%; width:100%"/></div>` —
  // the outer div has no style, so the inner `height:100%` resolves
  // against `auto` and collapses. Width works without this because
  // block elements fill their parent by default; height does not.
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

  // Flex-fill the parent slot (which itself flex-fills the card's
  // plot section), and fall back to `minHeight` for cases where the
  // parent hasn't constrained height yet (e.g. a loading race on
  // first mount).
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 300,
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

export default ReportPlot;

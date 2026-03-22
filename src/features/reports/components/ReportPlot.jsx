import { useEffect, useRef, useId } from 'react';
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

    // Extract and execute scripts from the HTML
    let scriptContent = null;
    parser(html, {
      replace: function (domNode) {
        if (domNode.type === 'script' && domNode.children?.[0]) {
          scriptContent = domNode.children[0].data;
        }
      },
    });

    if (scriptContent) {
      const scriptEl = document.createElement('script');
      scriptEl.dataset.id = `script-report-${uniqueId}`;
      document.body.appendChild(scriptEl);
      scriptEl.append(scriptContent);
      scriptRef.current = scriptEl;
    }

    // Notify parent that plot is rendered (for y-axis alignment)
    if (onPlotReady && containerRef.current) {
      // Plotly renders asynchronously after script execution; wait a tick
      const timer = setTimeout(() => {
        const plotDiv = containerRef.current?.querySelector('.plotly-graph-div, .js-plotly-plot');
        if (plotDiv) onPlotReady(plotDiv);
      }, 200);
      return () => {
        clearTimeout(timer);
        if (scriptRef.current) {
          scriptRef.current.remove();
          scriptRef.current = null;
        }
      };
    }

    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
    };
  }, [html, uniqueId, onPlotReady]);

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
    return (
      <div style={errorStyle}>
        <Empty
          description={`Failed to load plot: ${error.message || 'Unknown error'}`}
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

  // Filter to only div and style elements
  const filtered = Array.isArray(content)
    ? content.filter((node) => node?.type === 'div' || node?.type === 'style')
    : content;

  return <div ref={containerRef} style={{ minHeight: 300 }}>{filtered}</div>;
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

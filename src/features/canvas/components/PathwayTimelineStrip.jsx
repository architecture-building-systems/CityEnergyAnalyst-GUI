import { useMemo, useRef, useState } from 'react';
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
  const project = useProjectStore((s) => s.project);

  const [caption, setCaption] = useState('');
  const slotRef = useRef(null);

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
        <CanvasPlot
          scenario={parentScenario}
          plotConfig={plotConfig}
          onCaption={setCaption}
        />
      </div>
    </div>
  );
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '8px 16px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  width: '100%',
  height: 360,
  marginBottom: 12,
  overflow: 'hidden',
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

const chartAreaStyle = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
};

export default PathwayTimelineStrip;

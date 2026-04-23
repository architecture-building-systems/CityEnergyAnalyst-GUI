import { useState, useEffect, useCallback } from 'react';
import { ConfigProvider, Form, Button } from 'antd';
import { VerticalLeftOutlined } from '@ant-design/icons';

import Tool from 'features/tools/components/Tools/Tool';
// Reuse the exact picker the main viewport's PlotTool uses.
import { PlotChoices } from 'features/project/components/Cards/plot-tool';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';

/**
 * Plot configuration card — shares the main viewport's tool card chrome
 * AND its form layout. Uses `<Tool>` directly (from features/tools) so
 * the picker, header, description, parameter fields, and Run button
 * are pixel-identical to the main viewport. Only difference: `onRunOverride`
 * intercepts the Run click and commits the plot config to the report
 * slot instead of creating a job.
 *
 * Two phases inside the same card:
 *   1. Plot picker — `PlotChoices` imported from the main viewport.
 *   2. Parameter form — rendered by `<Tool>` with a Back button in the
 *      card header to return to the picker.
 */
const PlotEditModal = ({
  open,
  scenario: _scenario,
  plotConfig,
  mode = 'edit',
  onSave,
  onCancel,
}) => {
  // Note: `scenario` prop is accepted for API compatibility but the
  // embedded Tool pulls project/scenario from the project store itself.
  const [form] = Form.useForm();

  const [selectedScript, setSelectedScript] = useState(
    plotConfig?.script || null,
  );

  useEffect(() => {
    if (open) {
      setSelectedScript(plotConfig?.script || null);
      return undefined;
    }
    // Hold the current script for the duration of the slide-out
    // animation, then clear it so Tool's internal queries stop.
    const t = setTimeout(() => setSelectedScript(null), 350);
    return () => clearTimeout(t);
  }, [open, plotConfig]);

  // Seed the form with the existing plotConfig's parameters once the
  // Tool has finished loading its parameter metadata. `Tool` calls this
  // via `onParametersLoaded` after its own `useFormReset` runs.
  const handleParametersLoaded = useCallback(
    (_params) => {
      if (plotConfig?.parameters) {
        form.setFieldsValue(plotConfig.parameters);
      }
    },
    [form, plotConfig],
  );

  const handleBack = useCallback(() => {
    setSelectedScript(null);
    form.resetFields();
  }, [form]);

  // Tool.onRunOverride — called with validated form values. Commit the
  // plot config to the slot. Returning a Promise is fine; Tool awaits it.
  const handleRunOverride = useCallback(
    async (params) => {
      onSave({ script: selectedScript, parameters: params });
    },
    [onSave, selectedScript],
  );

  return (
    <div
      className="cea-tool-card"
      style={{
        ...cardStyle,
        // Fade + ignore pointer events when closed; the grid column
        // itself collapses to 0 in ReportsPage.
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {/* Header — matches ToolCard.jsx: optional Back, close icon right. */}
      <div className="cea-tool-card-header" style={headerStyle}>
        {selectedScript && <Button onClick={handleBack}>Back</Button>}
        <Button
          icon={<VerticalLeftOutlined />}
          onClick={onCancel}
          style={{ marginLeft: 'auto', padding: 12 }}
          aria-label="Close"
        />
      </div>

      <div className="cea-tool-card-content" style={contentStyle}>
        {selectedScript ? (
          // Re-colour antd's `primary` to the plots purple so the
          // Run button (and any other type="primary" control inside
          // Tool) matches the main viewport's plot-tool styling.
          <ConfigProvider
            theme={{ token: { colorPrimary: PLOTS_PRIMARY_COLOR } }}
          >
            <Tool
              key={selectedScript}
              script={selectedScript}
              form={form}
              onParametersLoaded={handleParametersLoaded}
              onRunOverride={handleRunOverride}
            />
          </ConfigProvider>
        ) : (
          <PlotChoices onSelected={setSelectedScript} />
        )}
      </div>
    </div>
  );
};

// The plot tool now lives in its own grid cell (see ReportsPage.jsx),
// so it fills the cell rather than being `position: fixed`. The grid
// column animates open/close in ReportsPage; we only handle the card
// chrome (shadow, radius, padding) here, copied from ToolCard.jsx.
const cardStyle = {
  width: '100%',
  height: '100%',
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  boxSizing: 'border-box',
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  transition: 'opacity 0.25s ease-in-out',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
};

const contentStyle = {
  minHeight: 0,
  flex: 1,
  overflowY: 'auto',
};

export default PlotEditModal;

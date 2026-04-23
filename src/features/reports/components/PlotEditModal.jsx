import { useState, useEffect } from 'react';
import { Form, Spin, Collapse, Empty, Button, Divider, Space } from 'antd';
import { LoadingOutlined, VerticalLeftOutlined } from '@ant-design/icons';
import { isElectron } from 'utils/electron';

import Parameter from 'components/Parameter';
import {
  PLOT_GROUPS,
  PLOT_LABELS,
  VIEW_PLOT_RESULTS,
} from 'features/plots/constants';
import { useFetchToolParams } from '../hooks/useReportsData';

// Reuse the exact same CSS the main viewport's PlotTool uses for its
// grouped button list, so the picker is pixel-identical.
import 'features/project/components/Cards/tool-choices.css';

/**
 * Plot configuration card — styled and laid out like the CEA main
 * viewport's tool card (see `ToolCard.jsx` + `plot-tool.jsx`). Floats
 * on the right side of the Reports page; the canvas under it stays
 * visible.
 *
 * Two phases inside the same card:
 *   1. Plot picker — grouped button list (mirrors `PlotChoices`).
 *   2. Parameter form — once a plot is picked, shows its parameters
 *      with a Back button to return to the picker.
 */
const ELECTRON_ONLY = [
  'multiprocessing',
  'number-of-cpus-to-keep-free',
  'debug',
];

const PlotChoices = ({ onSelected }) => (
  <div className="cea-tool-choices">
    <h2>Select a Plot Tool</h2>
    <div className="cea-tool-choices-group-list">
      {PLOT_GROUPS.map((group) => (
        <div key={group.label}>
          <Divider orientation="left" orientationMargin={0}>
            <span className="cea-tool-choices-group-label">
              {group.icon && <group.icon />}
              <small>{group.label}</small>
            </span>
          </Divider>
          <div className="cea-tool-choices-group-content">
            {group.subgroups ? (
              group.subgroups.map((sub) => (
                <div key={sub.label} className="cea-tool-choices-subgroup">
                  <small className="cea-tool-choices-subgroup-label">
                    {sub.label}
                  </small>
                  <div className="cea-tool-choices-button-list">
                    {sub.keys.map((key) => {
                      const script = VIEW_PLOT_RESULTS[key];
                      if (!script) return null;
                      return (
                        <Button
                          key={key}
                          className="cea-tool-choices-button"
                          onClick={() => onSelected(script)}
                        >
                          {PLOT_LABELS[key] || key}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="cea-tool-choices-button-list">
                {group.keys.map((key) => {
                  const script = VIEW_PLOT_RESULTS[key];
                  if (!script) return null;
                  return (
                    <Button
                      key={key}
                      className="cea-tool-choices-button"
                      onClick={() => onSelected(script)}
                    >
                      {PLOT_LABELS[key] || key}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PlotEditModal = ({
  open,
  scenario,
  plotConfig,
  mode = 'edit',
  onSave,
  onCancel,
}) => {
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
    // animation so the content doesn't re-lay out mid-transition,
    // then clear it so `useFetchToolParams` stops polling.
    const t = setTimeout(() => setSelectedScript(null), 350);
    return () => clearTimeout(t);
  }, [open, plotConfig]);

  const { data: toolData, isLoading: paramsLoading } = useFetchToolParams(
    selectedScript,
    scenario,
  );

  const parameters = toolData?.parameters;
  const categoricalParameters = toolData?.categorical_parameters;

  useEffect(() => {
    if (!parameters) return;
    const initialValues = {};
    const allParams = [
      ...parameters,
      ...Object.values(categoricalParameters || {}).flat(),
    ];
    allParams.forEach((p) => {
      if (plotConfig?.parameters?.[p.name] !== undefined) {
        initialValues[p.name] = plotConfig.parameters[p.name];
      } else {
        initialValues[p.name] = p.value;
      }
    });
    form.setFieldsValue(initialValues);
  }, [parameters, categoricalParameters, plotConfig, form]);

  const handleScriptChange = (value) => {
    setSelectedScript(value);
    form.resetFields();
  };

  const handleBack = () => {
    setSelectedScript(null);
    form.resetFields();
  };

  const handleRun = () => {
    const formValues = form.getFieldsValue();
    onSave({ script: selectedScript, parameters: formValues });
  };

  const shouldHideParam = (param) =>
    param.type === 'ScenarioParameter' ||
    (!isElectron() && ELECTRON_ONLY.includes(param.name));

  const renderParams = () => {
    if (paramsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin indicator={<LoadingOutlined spin />} />
        </div>
      );
    }
    if (!parameters) return null;

    const topParams = parameters
      .filter((p) => !shouldHideParam(p))
      .map((p) => (
        <Parameter
          key={p.name}
          parameter={p}
          form={form}
          toolName={selectedScript}
        />
      ));

    let catParams = null;
    if (categoricalParameters && Object.keys(categoricalParameters).length) {
      const items = Object.entries(categoricalParameters)
        .map(([cat, params]) => ({
          key: cat,
          label: cat,
          forceRender: true,
          children: params
            .filter((p) => !shouldHideParam(p))
            .map((p) => (
              <Parameter
                key={p.name}
                parameter={p}
                form={form}
                toolName={selectedScript}
              />
            )),
        }))
        .filter((item) => item.children.length > 0);
      if (items.length > 0) {
        catParams = <Collapse items={items} />;
      }
    }

    if (topParams.length === 0 && !catParams) {
      return <Empty description="No configurable parameters for this plot." />;
    }

    return (
      <>
        {topParams}
        {catParams}
      </>
    );
  };

  return (
    <div
      className="cea-tool-card"
      style={{
        ...cardStyle,
        transform: open
          ? 'translateX(0)'
          : 'translateX(calc(100% + 32px))',
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
          <Form form={form} layout="vertical" size="small">
            {renderParams()}
          </Form>
        ) : (
          <PlotChoices onSelected={handleScriptChange} />
        )}
      </div>

      {selectedScript && (
        <div style={footerStyle}>
          <Space>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" onClick={handleRun}>
              Run
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

// Match the main viewport's right-sidebar dimensions:
//   Project.css: `--right-sidebar-width: 480px`
//   `.cea-tool-card-container { position: absolute; top: 0; right: 0;
//      height: 100%; width: var(--right-sidebar-width); }`
// Reports doesn't use the overlay grid, so we use `position: fixed`
// and flush the card against the right edge. Inner chrome (radius,
// shadow, padding) copied from ToolCard.jsx:81-95 verbatim.
const cardStyle = {
  position: 'fixed',
  top: 16,
  right: 16,
  // Extra clearance at the bottom for the CEA status bar (`.cea-status-bar`
  // is 24px tall in `HomePage.css`) plus the same 16px breathing room.
  bottom: 40,
  width: 480,
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  boxSizing: 'border-box',
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  zIndex: 900,
  // Slide-in-from-right animation. Transform gets overridden on render
  // based on the `open` prop; the transition runs either way.
  transition:
    'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.25s ease-in-out',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  fontSize: 14,
};

const contentStyle = {
  minHeight: 0,
  flex: 1,
  overflowY: 'auto',
};

const footerStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  paddingTop: 8,
  marginTop: 8,
  borderTop: '1px solid #f0f0f0',
};

export default PlotEditModal;

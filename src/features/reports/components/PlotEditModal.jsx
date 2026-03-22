import { useState, useEffect } from 'react';
import { Modal, Select, Form, Spin, Collapse, Empty } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { isElectron } from 'utils/electron';

import Parameter from 'components/Parameter';
import {
  PLOT_GROUPS,
  PLOT_LABELS,
  VIEW_PLOT_RESULTS,
} from 'features/plots/constants';
import { useFetchToolParams } from '../hooks/useReportsData';

/**
 * Build a flat list of { value: scriptName, label } options from PLOT_GROUPS.
 */
function buildPlotOptions() {
  const options = [];
  for (const group of PLOT_GROUPS) {
    if (group.keys) {
      for (const key of group.keys) {
        const script = VIEW_PLOT_RESULTS[key];
        if (script) {
          options.push({ value: script, label: PLOT_LABELS[key] || script });
        }
      }
    }
    if (group.subgroups) {
      for (const sub of group.subgroups) {
        for (const key of sub.keys) {
          const script = VIEW_PLOT_RESULTS[key];
          if (script) {
            options.push({ value: script, label: PLOT_LABELS[key] || script });
          }
        }
      }
    }
  }
  return options;
}

const PLOT_OPTIONS = buildPlotOptions();

const ELECTRON_ONLY = [
  'multiprocessing',
  'number-of-cpus-to-keep-free',
  'debug',
];

/**
 * Modal for editing a plot slot's configuration.
 * Shows a plot type selector and the tool's parameter form.
 */
const PlotEditModal = ({ open, scenario, plotConfig, onSave, onCancel }) => {
  const [form] = Form.useForm();

  const [selectedScript, setSelectedScript] = useState(
    plotConfig?.script || null,
  );

  const { data: toolData, isLoading: paramsLoading } = useFetchToolParams(
    selectedScript,
    scenario,
  );

  const parameters = toolData?.parameters;
  const categoricalParameters = toolData?.categorical_parameters;

  // Set initial form values when parameters load
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

  const handleOk = () => {
    const formValues = form.getFieldsValue();
    onSave({
      script: selectedScript,
      parameters: formValues,
    });
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
    <Modal
      title="Edit Plot"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Apply"
      okButtonProps={{ disabled: !selectedScript }}
      width={520}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Plot type</label>
        <Select
          style={{ width: '100%' }}
          placeholder="Select a plot type"
          showSearch
          optionFilterProp="label"
          value={selectedScript}
          onChange={handleScriptChange}
          options={PLOT_OPTIONS}
        />
      </div>

      {selectedScript && (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <Form form={form} layout="vertical" size="small">
            {renderParams()}
          </Form>
        </div>
      )}
    </Modal>
  );
};

const labelStyle = {
  display: 'block',
  fontWeight: 600,
  marginBottom: 4,
  fontSize: 13,
};

export default PlotEditModal;

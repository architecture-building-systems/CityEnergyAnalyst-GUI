import { useEffect, useState } from 'react';
import Parameter from './Parameter';
import { Button, Collapse, Form } from 'antd';
import { animated } from '@react-spring/web';

import { useHoverGrow } from '../Project/Cards/OverviewCard/hooks';

import { RunIcon } from '../../assets/icons';

const ToolForm = ({ form, parameters, categoricalParameters, onMount }) => {
  const [activeKey, setActiveKey] = useState([]);

  let toolParams = null;
  if (parameters) {
    toolParams = parameters.map((param) => {
      if (param.type === 'ScenarioParameter') return null;
      return <Parameter key={param.name} form={form} parameter={param} />;
    });
  }

  let categoricalParams = null;
  if (categoricalParameters && Object.keys(categoricalParameters).length) {
    const categories = Object.keys(categoricalParameters).map((category) => ({
      key: category,
      label: category,
      children: categoricalParameters[category].map((param) => (
        <Parameter key={param.name} form={form} parameter={param} />
      )),
    }));
    categoricalParams = (
      <Collapse
        activeKey={activeKey}
        onChange={setActiveKey}
        items={categories}
      />
    );
  }

  useEffect(() => {
    onMount?.();
  }, []);

  return (
    <Form form={form} layout="vertical" className="cea-tool-form">
      {toolParams}
      {categoricalParams}
    </Form>
  );
};

export const ToolFormButtons = ({
  runScript,
  saveParams,
  setDefault,
  disabled = false,
}) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
  return (
    <>
      <animated.div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={disabled ? null : styles}
      >
        <Button type="primary" onClick={runScript} disabled={disabled}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Run
            <RunIcon style={{ fontSize: 18 }} />
          </div>
        </Button>
      </animated.div>

      <Button onClick={saveParams}>Save Settings</Button>
      <Button onClick={setDefault}>Reset</Button>
    </>
  );
};

export default ToolForm;

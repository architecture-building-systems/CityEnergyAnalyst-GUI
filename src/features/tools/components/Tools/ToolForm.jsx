import { useState, useCallback } from 'react';
import Parameter from 'components/Parameter';
import { Button, Collapse, Form } from 'antd';
import { animated } from '@react-spring/web';

import { useHoverGrow } from 'features/project/hooks/hover-grow';

import { RunIcon } from 'assets/icons';

const ToolForm = ({
  form,
  parameters,
  categoricalParameters,
  script,
  onRefetchNeeded,
}) => {
  const [activeKey, setActiveKey] = useState([]);
  const [watchedValues, setWatchedValues] = useState({});

  // Watch for changes in parameters that have dependents
  const handleFieldChange = useCallback(
    (changedFields) => {
      // Build dependency map: parameter_name -> [dependent_parameter_names]
      const allParams = [
        ...(parameters || []),
        ...Object.values(categoricalParameters || {}).flat(),
      ];

      const dependencyMap = {};
      allParams.forEach((param) => {
        if (param.depends_on && Array.isArray(param.depends_on)) {
          param.depends_on.forEach((depName) => {
            if (!dependencyMap[depName]) {
              dependencyMap[depName] = [];
            }
            dependencyMap[depName].push(param.name);
          });
        }
        // Backward compatibility: also check triggers_refetch
        if (param.triggers_refetch) {
          if (!dependencyMap[param.name]) {
            dependencyMap[param.name] = [];
          }
        }
      });

      // Check if any changed field has dependents
      for (const changedField of changedFields) {
        const fieldName = changedField.name[0];
        const newValue = changedField.value;
        const oldValue = watchedValues[fieldName];

        // Skip refetch on initial load (when oldValue is undefined)
        const isInitialLoad = oldValue === undefined;

        // Always update watched values when value changes
        if (newValue !== oldValue) {
          setWatchedValues((prev) => ({ ...prev, [fieldName]: newValue }));
        }

        // Check if this field has dependents (via depends_on or triggers_refetch)
        const hasDependents = dependencyMap[fieldName]?.length > 0;

        // Only trigger refetch if not initial load AND value changed AND has dependents
        if (!isInitialLoad && newValue !== oldValue && hasDependents) {
          console.log(
            `Parameter ${fieldName} changed, refetching form (dependents: ${dependencyMap[fieldName].join(', ')})`,
          );

          // Trigger refetch with current form values, changed param, and affected params
          const formValues = form.getFieldsValue();
          onRefetchNeeded?.(
            { ...formValues, [fieldName]: newValue },
            fieldName,
            dependencyMap[fieldName],
          );
          break; // Only need one refetch
        }
      }
    },
    [parameters, categoricalParameters, watchedValues, form, onRefetchNeeded],
  );

  let toolParams = null;
  if (parameters) {
    toolParams = parameters.map((param) => {
      if (param.type === 'ScenarioParameter') return null;
      return (
        <Parameter
          key={param.name}
          form={form}
          parameter={param}
          allParameters={parameters}
          toolName={script}
        />
      );
    });
  }

  let categoricalParams = null;
  if (categoricalParameters && Object.keys(categoricalParameters).length) {
    const categories = Object.keys(categoricalParameters).map((category) => ({
      key: category,
      label: category,
      children: categoricalParameters[category].map((param) => (
        <Parameter
          key={param.name}
          form={form}
          parameter={param}
          allParameters={parameters}
          toolName={script}
        />
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

  return (
    <Form
      form={form}
      layout="vertical"
      className="cea-tool-form"
      onFieldsChange={handleFieldChange}
    >
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
  const [loading, setLoading] = useState(false);

  const handleRunScript = async () => {
    setLoading(true);
    try {
      await runScript?.();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <animated.div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={disabled || loading ? null : styles}
      >
        <Button
          type="primary"
          onClick={handleRunScript}
          disabled={disabled}
          loading={loading}
        >
          {loading ? (
            <div>Staring job...</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Run
              <RunIcon style={{ fontSize: 18 }} />
            </div>
          )}
        </Button>
      </animated.div>

      <Button onClick={saveParams}>Save Settings</Button>
      <Button onClick={setDefault}>Reset</Button>
    </>
  );
};

export default ToolForm;

import { useState, useCallback, useEffect } from 'react';
import Parameter from 'components/Parameter';
import { Collapse, Form } from 'antd';
import useParameterMetadataRefetch from '../../hooks/useParameterMetadataRefetch';

const ToolForm = ({
  form,
  parameters,
  categoricalParameters,
  script,
  onParameterRefetch,
}) => {
  const [activeKey, setActiveKey] = useState([]);
  const [watchedValues, setWatchedValues] = useState({});

  const { handleRefetch, isRefetching } = useParameterMetadataRefetch(
    script,
    form,
  );

  useEffect(() => {
    onParameterRefetch?.(isRefetching);
  }, [isRefetching, onParameterRefetch]);

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
          handleRefetch(
            { ...formValues, [fieldName]: newValue },
            fieldName,
            dependencyMap[fieldName],
          );
          break; // Only need one refetch
        }
      }
    },
    [parameters, categoricalParameters, watchedValues, form, handleRefetch],
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
      forceRender: true, // Ensure content is rendered even when collapsed to preserve form state
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

export default ToolForm;

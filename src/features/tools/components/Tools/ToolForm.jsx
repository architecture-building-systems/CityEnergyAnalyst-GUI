import { useRef, useCallback, useEffect } from 'react';
import Parameter from 'components/Parameter';
import { Collapse, Form } from 'antd';
import { isElectron } from 'utils/electron';
import useParameterMetadataRefetch from '../../hooks/useParameterMetadataRefetch';
import { useToolFormStore } from '../../stores/tool-form-store';
import { useScrollFade } from '../../hooks/useScrollFade';

const ELECTRON_ONLY = [
  'multiprocessing',
  'number-of-cpus-to-keep-free',
  'debug',
];

const ToolForm = ({ form, parameters, categoricalParameters, script }) => {
  const { ref: scrollRef, maskStyle, recheck } = useScrollFade();
  const activeKey = useToolFormStore((state) => state.activeKey);
  const setActiveKey = useToolFormStore((state) => state.setActiveKey);
  const reset = useToolFormStore((state) => state.reset);
  const watchedValuesRef = useRef({});

  useEffect(() => {
    recheck();
  }, [script, recheck]);

  const { mutateAsync: handleRefetch } = useParameterMetadataRefetch(
    script,
    form,
  );

  useEffect(() => {
    reset();
    watchedValuesRef.current = {};
  }, [script, reset]);

  // Watch for changes in parameters that have dependents
  const handleFieldChange = useCallback(
    async (changedFields) => {
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
        const oldValue = watchedValuesRef.current[fieldName];

        // Skip refetch on initial load (when oldValue is undefined)
        const isInitialLoad = oldValue === undefined;

        // Always update watched values when value changes
        if (newValue !== oldValue) {
          watchedValuesRef.current[fieldName] = newValue;
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
          await handleRefetch({
            formValues: { ...formValues, [fieldName]: newValue },
            affectedParams: dependencyMap[fieldName],
          });
          break; // Only need one refetch
        }
      }
    },
    [parameters, categoricalParameters, form, handleRefetch],
  );

  const shouldHideParam = (param) =>
    param.type === 'ScenarioParameter' ||
    (!isElectron() && ELECTRON_ONLY.includes(param.name));

  let toolParams = null;
  if (parameters) {
    toolParams = parameters
      .filter((param) => !shouldHideParam(param))
      .map((param) => (
        <Parameter
          key={param.name}
          form={form}
          parameter={param}
          allParameters={parameters}
          toolName={script}
        />
      ));
  }

  let categoricalParams = null;
  if (categoricalParameters && Object.keys(categoricalParameters).length) {
    const categories = Object.keys(categoricalParameters)
      .map((category) => ({
        key: category,
        label: category,
        forceRender: true, // Ensure content is rendered even when collapsed to preserve form state
        children: categoricalParameters[category]
          .filter((param) => !shouldHideParam(param))
          .map((param) => (
            <Parameter
              key={param.name}
              form={form}
              parameter={param}
              allParameters={parameters}
              toolName={script}
            />
          )),
      }))
      .filter((category) => category.children.length > 0);
    categoricalParams = (
      <Collapse
        activeKey={activeKey}
        onChange={setActiveKey}
        items={categories}
      />
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        paddingInline: 12,
        ...maskStyle,
      }}
    >
      <Form
        form={form}
        layout="vertical"
        className="cea-tool-form"
        onFieldsChange={handleFieldChange}
      >
        {toolParams}
        {categoricalParams}
      </Form>
    </div>
  );
};

export default ToolForm;

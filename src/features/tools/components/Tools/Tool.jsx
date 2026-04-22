import { useEffect, useState, useCallback, useMemo } from 'react';
import { Divider, Spin, Alert, Button } from 'antd';
import { useIsMutating } from '@tanstack/react-query';
import { AsyncError } from 'components/AsyncError';
import { TOOLS_MUTATION_KEYS } from 'features/tools/constants/queryKeys';

import './Tool.css';

import ToolForm from './ToolForm';
import { ToolError } from './ToolError';
import { ToolFormButtons } from './ToolFormButtons';
import { ToolDescription } from 'features/tools/components/tool-description';
import { useChangesExist } from 'features/input-editor/stores/inputEditorStore';
import { ToolSkeleton } from '../tool-skeleton';
import { ScriptSuggestions } from './ScriptSuggestions';
import { useToolParams, useDescriptionAutoHide } from 'features/tools/hooks';
import { UpOutlined } from '@ant-design/icons';
import { useToolFormStore } from 'features/tools/stores/tool-form-store';
import { ToolChoices } from 'features/project/components/Cards/tool-choices';
import { useProjectStore } from 'features/project/stores/projectStore';

const PATHWAY_VIEWER_OVERRIDES = {
  'network-layout': (year) => ({
    'network-name': `thermal_network_${year}`,
    'overwrite-supply-settings': false,
  }),
  'final-energy': () => ({
    'what-if-name': 'default',
    'overwrite-supply-settings': false,
  }),
};

const Tool = ({ script, onToolSelected, form, onParametersLoaded }) => {
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [toolError, setToolError] = useState(null);

  const expandCategories = useToolFormStore((state) => state.expandCategories);

  useDescriptionAutoHide(setHeaderCollapsed);

  const onValidationError = useCallback(
    (err, categoriesToExpand) => {
      const errorFieldNames =
        err?.errorFields?.map((field) => field.name.join('.')) || null;

      if (errorFieldNames) {
        const fieldList = errorFieldNames.join(', ');
        setToolError(`Validation failed for fields: ${fieldList}`);
      } else {
        setToolError('Validation failed. Check errors in the form.');
      }

      if (categoriesToExpand.length > 0) {
        expandCategories(categoriesToExpand);
      }

      const firstErrorField = err?.errorFields?.[0]?.name;
      if (firstErrorField) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            form.scrollToField(firstErrorField, { focus: true });
          });
        });
      }
    },
    [expandCategories, form],
  );

  const onParametersChange = useCallback(() => {
    // Clear tool error when parameters change
    setToolError(null);
  }, []);

  const childScenario = useProjectStore((state) => state.childScenario);

  const pathwayOverrides = useMemo(() => {
    if (!childScenario || childScenario.year == null) return {};
    const builder = PATHWAY_VIEWER_OVERRIDES[script];
    return builder ? builder(childScenario.year) : {};
  }, [childScenario, script]);

  const pathwayReadonlyFields = useMemo(
    () => Object.keys(pathwayOverrides),
    [pathwayOverrides],
  );

  const {
    params,
    isLoading,
    isFetching,
    fetchError: error,
    inputError,
    recheckInputs,
  } = useToolParams(script, form, onValidationError, onParametersChange);

  const isChecking =
    useIsMutating({ mutationKey: [TOOLS_MUTATION_KEYS.CHECK_INPUTS] }) > 0;
  const isSaving =
    useIsMutating({ mutationKey: [TOOLS_MUTATION_KEYS.SAVE_TOOL_PARAMS] }) > 0;
  const isResetting =
    useIsMutating({
      mutationKey: [TOOLS_MUTATION_KEYS.SET_DEFAULT_TOOL_PARAMS],
    }) > 0;
  const isRefetching =
    useIsMutating({
      mutationKey: [TOOLS_MUTATION_KEYS.REFETCH_PARAMETER_METADATA],
    }) > 0;

  const {
    category,
    label,
    description,
    parameters: rawParameters,
    categorical_parameters: categoricalParameters,
  } = params || {};

  const parameters = useMemo(() => {
    if (!rawParameters || Object.keys(pathwayOverrides).length === 0)
      return rawParameters;
    return rawParameters.map((p) =>
      p.name in pathwayOverrides ? { ...p, value: pathwayOverrides[p.name] } : p,
    );
  }, [rawParameters, pathwayOverrides]);

  const isInputChecked = inputError !== undefined;
  const hasInputError = inputError != null;
  const disableButtons = isChecking || !isInputChecked || hasInputError;
  const changes = useChangesExist();

  const handleReCheck = useCallback(() => {
    setToolError(null);
    recheckInputs();
  }, [recheckInputs]);

  // Fires after useFormReset — lets parents re-seed form values.
  useEffect(() => {
    if (params && onParametersLoaded) {
      onParametersLoaded(params, { recheck: handleReCheck });
    }
  }, [params, onParametersLoaded, handleReCheck]);

  // Apply pathway viewer overrides after every form reset.
  useEffect(() => {
    if (form && params && Object.keys(pathwayOverrides).length > 0) {
      form.setFieldsValue(pathwayOverrides);
    }
  }, [form, params, pathwayOverrides]);

  if (script == null) return <ToolChoices onSelected={onToolSelected} />;

  if (isLoading)
    return (
      <div style={{ padding: 12 }}>
        <ToolSkeleton loadingText="Loading parameters..." />
      </div>
    );
  if (error) {
    // Normalize error for AsyncError component
    const normalizedError = error?.response || {
      data: { message: error?.message || 'Unknown error' },
    };
    return <AsyncError error={normalizedError} />;
  }

  if (!label) return null;

  return (
    <div
      className="cea-tool-wrapper"
      style={{ height: '100%', position: 'relative' }}
    >
      <Spin
        spinning={isSaving || isResetting || isFetching || isRefetching}
        tip={
          (isFetching && 'Refreshing parameters...') ||
          (isSaving && 'Saving parameters...') ||
          (isResetting && 'Resetting parameters...') ||
          (isRefetching && 'Updating form...') ||
          ''
        }
        styles={{
          root: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          },
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <div
            id="cea-tool-header"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,

              paddingTop: 12,
              paddingInline: 12,
            }}
          >
            <div className="cea-tool-header-content">
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',

                  marginLeft: 'auto',
                }}
              >
                <small>{category}</small>
              </div>

              <b style={{ fontSize: 18 }}>{label}</b>

              <div
                className={`cea-tool-description-wrapper ${headerCollapsed ? 'collapsed' : ''}`}
              >
                <ToolDescription description={description} />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div className="cea-tool-form-buttongroup">
                <ToolFormButtons
                  form={form}
                  disabled={disableButtons}
                  parameters={parameters}
                  categoricalParameters={categoricalParameters}
                  script={script}
                  setError={setToolError}
                  onValidationError={onValidationError}
                />
              </div>
              <Button
                icon={
                  <UpOutlined
                    style={{
                      transition: 'transform 0.3s',
                      transform: headerCollapsed ? 'rotate(180deg)' : 'none',
                    }}
                  />
                }
                type="text"
                onClick={() => setHeaderCollapsed(!headerCollapsed)}
              />
            </div>

            <ToolError error={toolError} onRecheck={handleReCheck} />

            {inputError != null && !inputError?.script_suggestions && (
              <ToolError
                title="Unable to check inputs"
                error={inputError}
                onRecheck={handleReCheck}
              />
            )}

            {changes && (
              <Alert
                title="Unsaved changes detected."
                description="Save or discard before proceeding."
                type="warning"
                showIcon
              />
            )}

            <ScriptSuggestions
              onToolSelected={onToolSelected}
              loading={isChecking}
              scriptSuggestions={inputError?.script_suggestions}
            />
          </div>

          <Divider />

          <ToolForm
            form={form}
            parameters={parameters}
            categoricalParameters={categoricalParameters}
            script={script}
            extraReadonlyFields={pathwayReadonlyFields}
          />
        </div>
      </Spin>
    </div>
  );
};

export default Tool;

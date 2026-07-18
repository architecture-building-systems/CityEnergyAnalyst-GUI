import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Divider, Spin } from 'antd';
import { useIsMutating } from '@tanstack/react-query';
import { AsyncError } from 'components/AsyncError';
import { TOOLS_MUTATION_KEYS } from 'features/tools/constants/queryKeys';

import './Tool.css';

import ToolForm from './ToolForm';
import { ToolControls } from './ToolControls';
import { ToolDescription } from 'features/tools/components/tool-description';
import { useChangesExist } from 'features/input-editor/stores/inputEditorStore';
import { ToolSkeleton } from '../tool-skeleton';
import {
  useToolParams,
  useDescriptionAutoHide,
  useSkeletonDelay,
} from 'features/tools/hooks';
import { ToolChoices } from 'features/project/components/Cards/tool-choices';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useActiveScenarioContext } from 'lib/api/scenarioContext';
import { useDemoMode } from 'stores/demoStore';

const SCRIPT_READONLY_PARAMS = {
  'pathway-update-building-events': ['existing-pathway-names', 'year-of-state'],
  'pathway-simulations': ['existing-pathway-name'],
};

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

const Tool = ({
  script,
  onToolSelected,
  form,
  onParametersLoaded,
  onRunOverride,
  extraReadonlyFields: externalReadonlyFields,
  // When set, parameter fetches and input validation target this
  // specific scenario instead of the active project scenario.
  scenarioOverride = null,
}) => {
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const demoMode = useDemoMode();

  useDescriptionAutoHide(setHeaderCollapsed);

  const recheckRef = useRef(() => {});
  const registerRecheck = useCallback((fn) => {
    recheckRef.current = fn;
  }, []);

  const childScenario = useProjectStore((state) => state.childScenario);

  // Resolve the nullable `scenarioOverride` prop into a scenario context
  // that's always fully specified, so downstream hooks (`useToolParams`,
  // `useInputValidation`) never need to know about the active scenario or
  // fall back to it themselves - they just take the context they're given.
  // A column override never carries the active scenario's pathway state.
  const activeScenarioContext = useActiveScenarioContext();
  const scenarioContext = scenarioOverride
    ? { ...scenarioOverride, childScenario: null }
    : activeScenarioContext;

  const pathwayOverrides = useMemo(() => {
    if (scenarioOverride || !childScenario || childScenario.year == null)
      return {};
    const builder = PATHWAY_VIEWER_OVERRIDES[script];
    return builder ? builder(childScenario.year) : {};
  }, [scenarioOverride, childScenario, script]);

  // Combine: script-static readonly params, pathway-viewer overrides,
  // and any caller-supplied extras (e.g. canvas passes ['what-if-name']).
  const readonlyFields = useMemo(
    () => [
      ...(SCRIPT_READONLY_PARAMS[script] ?? []),
      ...Object.keys(pathwayOverrides),
      ...(externalReadonlyFields || []),
    ],
    [script, pathwayOverrides, externalReadonlyFields],
  );

  const {
    params,
    isLoading,
    isFetching,
    fetchError: error,
    dataUpdatedAt,
  } = useToolParams(script, form, scenarioContext);

  const showSkeleton = useSkeletonDelay(isLoading);

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
      p.name in pathwayOverrides
        ? { ...p, value: pathwayOverrides[p.name] }
        : p,
    );
  }, [rawParameters, pathwayOverrides]);

  const changes = useChangesExist();

  // Fires after useFormReset — lets parents re-seed form values.
  useEffect(() => {
    if (params && onParametersLoaded) {
      onParametersLoaded(params, { recheck: () => recheckRef.current() });
    }
  }, [params, onParametersLoaded]);

  // Apply pathway viewer overrides after every form reset.
  useEffect(() => {
    if (form && params && Object.keys(pathwayOverrides).length > 0) {
      form.setFieldsValue(pathwayOverrides);
    }
  }, [form, params, pathwayOverrides]);

  if (script == null) return <ToolChoices onSelected={onToolSelected} />;

  if (showSkeleton)
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
                className={`cea-tool-description-wrapper ${headerCollapsed ? 'collapsed' : demoMode ? '' : 'expanded'}`}
              >
                <ToolDescription description={description} />
              </div>
            </div>

            {demoMode ? (
              <div>Log in to access this tool and its parameters.</div>
            ) : (
              <ToolControls
                form={form}
                script={script}
                parameters={parameters}
                categoricalParameters={categoricalParameters}
                scenarioContext={scenarioContext}
                dataUpdatedAt={dataUpdatedAt}
                onToolSelected={onToolSelected}
                onRunOverride={onRunOverride}
                changes={changes}
                headerCollapsed={headerCollapsed}
                setHeaderCollapsed={setHeaderCollapsed}
                onRecheckReady={registerRecheck}
              />
            )}
          </div>

          <Divider />

          <ToolForm
            form={form}
            parameters={parameters}
            categoricalParameters={categoricalParameters}
            script={script}
            readonlyFields={readonlyFields}
          />
        </div>
      </Spin>
    </div>
  );
};

export default Tool;

import { useState } from 'react';
import { Divider, Spin, Alert, Button } from 'antd';
import { useIsMutating } from '@tanstack/react-query';
import { AsyncError } from 'components/AsyncError';
import { TOOLS_MUTATION_KEYS } from 'features/tools/constants/queryKeys';

import './Tool.css';

import ToolForm from './ToolForm';
import { ToolFormButtons } from './ToolFormButtons';
import { ToolDescription } from 'features/tools/components/tool-description';
import { useChangesExist } from 'features/input-editor/stores/inputEditorStore';
import { ToolSkeleton } from '../tool-skeleton';
import { ScriptSuggestions } from './ScriptSuggestions';
import { useToolParams } from 'features/tools/hooks';
import { UpOutlined } from '@ant-design/icons';

const Tool = ({ script, onToolSelected, form }) => {
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const {
    params,
    isLoading,
    isFetching,
    fetchError: error,
    inputError,
  } = useToolParams(script, form);

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
    parameters,
    categorical_parameters: categoricalParameters,
  } = params || {};
  const isInputChecked = inputError !== undefined;
  const hasInputError = inputError != null;
  const disableButtons = isChecking || !isInputChecked || hasInputError;
  const changes = useChangesExist();

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
          (isSaving && 'Saving parameters...') ||
          (isResetting && 'Resetting parameters...') ||
          (isFetching && 'Updating parameters...') ||
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
              error={inputError}
            />
          </div>

          <Divider />

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              paddingInline: 12,
            }}
          >
            <ToolForm
              form={form}
              parameters={parameters}
              categoricalParameters={categoricalParameters}
              script={script}
            />
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default Tool;

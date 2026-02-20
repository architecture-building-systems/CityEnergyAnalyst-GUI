import { useState } from 'react';
import { Divider, Spin, Alert } from 'antd';
import { useCheckInputs } from 'features/tools/stores/checkInputsStore';
import { useSaveToolParamsMutation } from 'features/tools/hooks/mutations';
import { AsyncError } from 'components/AsyncError';

import './Tool.css';

import ToolForm from './ToolForm';
import { ToolFormButtons } from './ToolFormButtons';
import { ToolDescription } from 'features/tools/components/tool-description';
import { useChangesExist } from 'features/input-editor/stores/inputEditorStore';
import { ToolSkeleton } from '../tool-skeleton';
import { ScriptSuggestions } from './ScriptSuggestions';
import { useToolParams, useFetchToolParams } from 'features/tools/hooks';

const Tool = ({ script, onToolSelected, header, form }) => {
  const {
    data: params,
    isLoading,
    isFetching,
    error,
  } = useFetchToolParams(script);
  const { isPending: isSaving } = useSaveToolParamsMutation();
  const { checking: checkingInputs, error: inputError } = useCheckInputs();

  const {
    category,
    label,
    description,
    parameters,
    categorical_parameters: categoricalParameters,
  } = params || {};

  useToolParams(script, form, parameters, categoricalParameters);

  const [isRefetching, setIsRefetching] = useState(false);
  const disableButtons = checkingInputs || inputError !== null;
  const changes = useChangesExist();

  if (isLoading)
    return (
      <div style={{ padding: 12 }}>
        {header}
        <ToolSkeleton loadingText="Loading parameters..." />
      </div>
    );
  if (error) {
    // Normalize error for AsyncError component
    const normalizedError = error?.response || {
      data: { message: error?.message || 'Unknown error' },
    };
    return (
      <div>
        {header}
        <AsyncError error={normalizedError} />
      </div>
    );
  }
  if (!label) return null;

  return (
    <Spin
      wrapperClassName="cea-tool-form-spinner"
      spinning={isSaving || isFetching || isRefetching}
    >
      <div
        style={{
          // position: 'relative', // Add this to ensure proper spin overlay
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
          <div id="cea-tool-header-content">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {header}
              <small
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',

                  marginLeft: 'auto',
                }}
              >
                <span>{category}</span>
              </small>
            </div>
            <ToolDescription description={description} label={label} />
          </div>

          <div className="cea-tool-form-buttongroup">
            <ToolFormButtons
              form={form}
              disabled={disableButtons}
              parameters={parameters}
              categoricalParameters={categoricalParameters}
              script={script}
            />
          </div>

          {changes && (
            <Alert
              title={
                <>
                  Unsaved changes detected. <br />
                  Save or discard before proceeding.
                </>
              }
              type="warning"
              showIcon
            />
          )}

          <ScriptSuggestions
            onToolSelected={onToolSelected}
            loading={checkingInputs}
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
            onParameterRefetch={setIsRefetching}
          />
        </div>
      </div>
    </Spin>
  );
};

export default Tool;

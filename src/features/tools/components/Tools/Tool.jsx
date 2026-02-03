import { Divider, Spin, Alert } from 'antd';
import useToolsStore from 'features/tools/stores/toolsStore';
import { AsyncError } from 'components/AsyncError';

import './Tool.css';

import ToolForm, { ToolFormButtons } from './ToolForm';
import { ToolDescription } from 'features/tools/components/tool-description';
import { useChangesExist } from 'features/input-editor/stores/inputEditorStore';
import { ToolSkeleton } from '../tool-skeleton';
import { ScriptSuggestions } from './ScriptSuggestions';
import {
  useCheckMissingInputs,
  useToolForm,
  useSkeletonDelay,
  useHeaderVisibility,
  useParameterMetadataRefetch,
  useToolParams,
} from 'features/tools/hooks';

const Tool = ({ script, onToolSelected, header, form: externalForm }) => {
  const { status, error, params } = useToolsStore((state) => state.toolParams);
  const { isSaving } = useToolsStore((state) => state.toolSaving);
  const updateParameterMetadata = useToolsStore(
    (state) => state.updateParameterMetadata,
  );

  const changes = useChangesExist();

  const {
    category,
    label,
    description,
    parameters,
    categorical_parameters: categoricalParameters,
  } = params;

  const {
    fetch: checkMissingInputs,
    fetching,
    error: _error,
  } = useCheckMissingInputs(script);
  const disableButtons = fetching || _error !== null;

  const showSkeleton = useSkeletonDelay(350);

  const { headerVisible, descriptionRef, descriptionHeight, handleScroll } =
    useHeaderVisibility(description, showSkeleton);

  const { form, getForm, runScript, saveParams, setDefault } = useToolForm(
    script,
    parameters,
    categoricalParameters,
    {
      onSave: checkMissingInputs, // Check inputs when saving to make sure they are valid if changed
      onReset: checkMissingInputs,
    },
    externalForm,
  );

  // FIXME: Run check missing inputs when form validation passes
  useToolParams(script, form, getForm, checkMissingInputs);

  const { handleRefetch, isRefetching } = useParameterMetadataRefetch(
    script,
    form,
    getForm,
    checkMissingInputs,
    updateParameterMetadata,
  );

  if (status == 'fetching' || showSkeleton)
    return (
      <div style={{ padding: 12 }}>
        {header}
        <ToolSkeleton loadingText="Loading parameters..." />
      </div>
    );
  if (status == 'failed')
    return (
      <div>
        {header}
        <AsyncError error={error} />
      </div>
    );
  if (!label) return null;

  return (
    <Spin
      wrapperClassName="cea-tool-form-spinner"
      spinning={isSaving || isRefetching}
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
                {!headerVisible && <b>{label}</b>}
              </small>
            </div>
            <ToolDescription
              ref={descriptionRef}
              description={description}
              height={descriptionHeight}
              label={label}
              visible={headerVisible}
            />
          </div>

          <div className="cea-tool-form-buttongroup">
            <ToolFormButtons
              runScript={runScript}
              saveParams={saveParams}
              setDefault={setDefault}
              disabled={disableButtons}
            />
          </div>

          {changes && (
            <Alert
              message={
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
            fetching={fetching}
            error={_error}
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
          onScroll={handleScroll}
        >
          <ToolForm
            form={form}
            parameters={parameters}
            categoricalParameters={categoricalParameters}
            script={script}
            disableButtons={disableButtons}
            onRefetchNeeded={handleRefetch}
          />
        </div>
      </div>
    </Spin>
  );
};

export default Tool;

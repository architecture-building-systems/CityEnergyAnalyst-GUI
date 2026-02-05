import { Divider, Spin, Alert } from 'antd';
import useToolsStore from 'features/tools/stores/toolsStore';
import { AsyncError } from 'components/AsyncError';

import './Tool.css';

import ToolForm from './ToolForm';
import { ToolFormButtons } from './ToolFormButtons';
import { ToolDescription } from 'features/tools/components/tool-description';
import { useChangesExist } from 'features/input-editor/stores/inputEditorStore';
import { ToolSkeleton } from '../tool-skeleton';
import { ScriptSuggestions } from './ScriptSuggestions';
import {
  useCheckMissingInputs,
  useSkeletonDelay,
  useHeaderVisibility,
  useParameterMetadataRefetch,
  useToolParams,
} from 'features/tools/hooks';

const Tool = ({ script, onToolSelected, header, form }) => {
  const { status, error, params, isSaving } = useToolsStore(
    (state) => state.toolParams,
  );
  const { checking, error: _error } = useCheckMissingInputs(script);

  const {
    category,
    label,
    description,
    parameters,
    categorical_parameters: categoricalParameters,
  } = params;

  // FIXME: Run check missing inputs when form validation passes
  useToolParams(script, form, parameters, categoricalParameters);
  const { handleRefetch, isRefetching } = useParameterMetadataRefetch(
    script,
    form,
  );

  const disableButtons = checking || _error !== null;
  const showSkeleton = useSkeletonDelay(350);

  const { headerVisible, descriptionRef, descriptionHeight, handleScroll } =
    useHeaderVisibility(description, showSkeleton);

  const changes = useChangesExist();

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
            fetching={checking}
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
            onRefetchNeeded={handleRefetch}
          />
        </div>
      </div>
    </Spin>
  );
};

export default Tool;

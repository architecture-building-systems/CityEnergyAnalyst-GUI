import { useCallback, useEffect, useState } from 'react';
import { Button } from 'antd';
import { useIsMutating } from '@tanstack/react-query';
import { UpOutlined } from '@ant-design/icons';

import { TOOLS_MUTATION_KEYS } from 'features/tools/constants/queryKeys';
import useInputValidation from 'features/tools/hooks/useInputValidation';
import { useToolFormStore } from 'features/tools/stores/tool-form-store';
import { ToolFormButtons } from './ToolFormButtons';
import { ToolValidationMessages } from './ToolValidationMessages';

export const ToolControls = ({
  form,
  script,
  parameters,
  categoricalParameters,
  scenarioOverride,
  dataUpdatedAt,
  onToolSelected,
  onRunOverride,
  changes,
  headerCollapsed,
  setHeaderCollapsed,
  onRecheckReady,
}) => {
  const [toolError, setToolError] = useState(null);
  // Clear tool error when parameters change (save, reset, or refetch)
  const [prevDataUpdatedAt, setPrevDataUpdatedAt] = useState(dataUpdatedAt);
  if (dataUpdatedAt !== prevDataUpdatedAt) {
    setPrevDataUpdatedAt(dataUpdatedAt);
    setToolError(null);
  }

  const expandCategories = useToolFormStore((state) => state.expandCategories);

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

  const { inputError, recheckInputs } = useInputValidation(
    script,
    parameters,
    categoricalParameters,
    form,
    onValidationError,
    dataUpdatedAt,
    scenarioOverride,
  );

  const isChecking =
    useIsMutating({ mutationKey: [TOOLS_MUTATION_KEYS.CHECK_INPUTS] }) > 0;

  const isInputChecked = inputError !== undefined;
  const hasInputError = inputError != null;
  const disableButtons = isChecking || !isInputChecked || hasInputError;

  const handleReCheck = useCallback(() => {
    setToolError(null);
    recheckInputs();
  }, [recheckInputs]);

  useEffect(() => {
    onRecheckReady?.(handleReCheck);
  }, [handleReCheck, onRecheckReady]);

  return (
    <div>
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
            onRunOverride={onRunOverride}
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

      <ToolValidationMessages
        toolError={toolError}
        inputError={inputError}
        onRecheck={handleReCheck}
        changes={changes}
        isChecking={isChecking}
        onToolSelected={onToolSelected}
      />
    </div>
  );
};

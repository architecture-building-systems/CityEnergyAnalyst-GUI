import { Alert } from 'antd';
import { ToolError } from './ToolError';
import { ScriptSuggestions } from './ScriptSuggestions';

export const ToolValidationMessages = ({
  toolError,
  inputError,
  onRecheck,
  changes,
  isChecking,
  onToolSelected,
}) => {
  return (
    <>
      <ToolError error={toolError} onRecheck={onRecheck} />

      {inputError != null && !inputError?.script_suggestions && (
        <ToolError
          title="Unable to check inputs"
          error={inputError}
          onRecheck={onRecheck}
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
    </>
  );
};

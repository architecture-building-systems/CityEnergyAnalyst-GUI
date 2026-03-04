import { LoadingOutlined } from '@ant-design/icons';
import { Alert } from 'antd';
import { ExternalLinkIcon } from 'assets/icons';
import { ToolError } from './ToolError';

export const ScriptSuggestions = ({ onToolSelected, loading, error }) => {
  if (loading)
    return (
      <div
        className="cea-script-suggestions"
        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}
      >
        <LoadingOutlined spin />
        <div style={{ fontFamily: 'monospace' }}>
          Checking for required inputs...
        </div>
      </div>
    );

  // Checks have not been run or there is no error, so ignore
  if (error === undefined || error === null) return null;

  // If error contains script suggestions, show them
  if (error?.script_suggestions?.length) {
    return (
      <div className="cea-script-suggestions animate-fade-in">
        <Alert
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <b>Missing required inputs detected.</b>
              <div>Run the following scripts to create the missing inputs:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {error.script_suggestions.map(({ label, name }) => {
                  return (
                    <div
                      key={name}
                      style={{ marginLeft: 8, display: 'flex', gap: 8 }}
                    >
                      <span>-</span>
                      <button
                        type="button"
                        className="cea-tool-suggestions-button"
                        onClick={() => onToolSelected?.(name)}
                      >
                        <b style={{ flex: 1 }}>{label}</b>
                        <ExternalLinkIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          }
          type="info"
          showIcon
        />
      </div>
    );
  }

  if (error?.field_errors)
    return <ToolError title="Unable to check inputs" error={error} />;

  // Any other error (e.g., string error message)
  return (
    <div className="cea-script-suggestions">
      <Alert
        title="Input check failed"
        description={
          typeof error === 'string'
            ? error
            : 'Something went wrong while checking for missing inputs.'
        }
        type="error"
        showIcon
      />
    </div>
  );
};

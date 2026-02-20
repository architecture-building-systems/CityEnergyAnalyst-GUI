import { Alert } from 'antd';
import { ExternalLinkIcon } from 'assets/icons';

export const ScriptSuggestions = ({ onToolSelected, loading, error }) => {
  if (loading)
    return (
      <div style={{ fontFamily: 'monospace' }}>
        Checking for missing inputs...
      </div>
    );

  // Checks have not been run or there is no error, so ignore
  if (error === undefined || error === null) return null;

  // If error contains script suggestions, show them
  if (error?.script_suggestions?.length) {
    return (
      <Alert
        title="Missing inputs detected"
        description={
          <div>
            <p>Run the following scripts to create the missing inputs:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {error.script_suggestions.map(({ label, name }) => {
                return (
                  <div key={name} style={{ display: 'flex', gap: 8 }}>
                    -
                    <button
                      className="cea-tool-suggestions"
                      onClick={() => onToolSelected?.(name)}
                      style={{ marginRight: 'auto' }}
                    >
                      <b>{label}</b>
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
    );
  }

  // Any other error (e.g., string error message)
  return (
    <Alert
      title="Error"
      description={
        typeof error === 'string'
          ? error
          : 'Something went wrong while checking for missing inputs.'
      }
      type="error"
      showIcon
    />
  );
};

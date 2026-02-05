import { Alert } from 'antd';
import { ExternalLinkIcon } from 'assets/icons';

export const ScriptSuggestions = ({ onToolSelected, fetching, error }) => {
  if (fetching)
    return (
      <div style={{ fontFamily: 'monospace' }}>
        Checking for missing inputs...
      </div>
    );

  // Checks have not been run, so ignore
  if (error == undefined) return null;

  if (error?.length)
    return (
      <Alert
        title="Missing inputs detected"
        description={
          <div>
            <p>Run the following scripts to create the missing inputs:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {error.map(({ label, name }) => {
                return (
                  <div key={name} style={{ display: 'flex', gap: 8 }}>
                    -
                    <b
                      className="cea-tool-suggestions"
                      onClick={() => onToolSelected?.(name)}
                      style={{ marginRight: 'auto' }}
                      aria-hidden
                    >
                      {label}
                      <ExternalLinkIcon style={{ fontSize: 18 }} />
                    </b>
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

  // Error should be null if there is no error
  if (error !== null) {
    return (
      <Alert
        title="Error"
        description="Something went wrong while checking for missing inputs."
        type="error"
        showIcon
      />
    );
  }
  return null;
};

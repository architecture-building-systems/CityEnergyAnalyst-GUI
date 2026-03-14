import { LoadingOutlined } from '@ant-design/icons';
import { Alert } from 'antd';
import { ExternalLinkIcon } from 'assets/icons';

export const ScriptSuggestions = ({
  onToolSelected,
  loading,
  scriptSuggestions,
}) => {
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

  if (!scriptSuggestions?.length) return null;

  return (
    <div className="cea-script-suggestions animate-fade-in">
      <Alert
        description={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <b>Missing required inputs detected.</b>
            <div>Run the following scripts to create the missing inputs:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scriptSuggestions.map(({ label, name }) => {
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
};

import { LoadingOutlined } from '@ant-design/icons';
import { Alert } from 'antd';
import { useEffect, useState } from 'react';
import { ExternalLinkIcon } from 'assets/icons';

export const ScriptSuggestions = ({
  onToolSelected,
  loading,
  scriptSuggestions,
}) => {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    // Only show loading indicator if loading takes more than 200ms to avoid flicker
    const delay = loading ? 200 : 0;
    const timer = setTimeout(() => setShowLoading(loading), delay);
    return () => clearTimeout(timer);
  }, [loading]);

  if (showLoading)
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

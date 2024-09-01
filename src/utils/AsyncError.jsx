import { Result } from 'antd';
import { isElectron, openExternal } from './electron';

// TODO: Find way to show error log
export function AsyncError({ title = 'Something went wrong', error }) {
  return (
    <Result
      status="error"
      title={title}
      subTitle={
        <div>
          <p>
            You may submit the contents of the log file and the error details as
            an issue on our GitHub{' '}
            <span
              aria-hidden
              style={{
                cursor: 'pointer',
                color: 'blue',
                textDecoration: 'underline',
              }}
              onClick={() => {
                const url =
                  'https://github.com/architecture-building-systems/CityEnergyAnalyst/issues/new?assignees=&labels=bug&template=bug_report.md&title=';
                if (isElectron()) openExternal(url);
                else window.open(url, '_blank', 'noreferrer');
              }}
            >
              here
            </span>
            .
          </p>
        </div>
      }
    >
      <div>
        <h3>Error Message:</h3>
        <p style={{ fontFamily: 'monospace' }}>
          {error?.data?.message || error?.data?.detail || 'UNKNOWN ERROR'}
        </p>
        {error?.data?.trace && (
          <details style={{ cursor: 'pointer' }}>
            <pre
              style={{
                margin: 12,
                padding: 16,
                cursor: 'auto',
                border: '1px solid #ccc',
                borderRadius: 16,
                background: 'white',
                maxHeight: 500,
                overflow: 'auto',
              }}
            >
              {error.data.trace}
            </pre>
          </details>
        )}
      </div>
    </Result>
  );
}

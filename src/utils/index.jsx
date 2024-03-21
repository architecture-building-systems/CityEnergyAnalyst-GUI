import { Result } from 'antd';

export function createNestedProp(obj, prop, ...rest) {
  if (typeof obj[prop] == 'undefined') {
    obj[prop] = {};
  }
  if (rest.length === 0) return true;
  return createNestedProp(obj[prop], ...rest);
}

export function deleteNestedProp(obj, prop, ...rest) {
  if (rest.length === 0) {
    delete obj[prop];
    return true;
  }
  if (deleteNestedProp(obj[prop], ...rest)) {
    if (!Object.keys(obj[prop]).length) {
      delete obj[prop];
      return true;
    }
  }
}

// TODO: Find way to show error log
export const AsyncError = ({ title = 'Something went wrong', error }) => {
  return (
    <Result
      status="error"
      title={title}
      subTitle={
        <div>
          <p>
            You may submit the contents of the log file and the error details as
            an issue on our GitHub{' '}
            <a
              href="https://github.com/architecture-building-systems/CityEnergyAnalyst/issues/new?assignees=&labels=bug&template=bug_report.md&title="
              target="_blank"
              rel="noopener noreferrer"
            >
              here.
            </a>
          </p>
        </div>
      }
    >
      <div>
        <h3>Error Message:</h3>
        <p style={{ fontFamily: 'monospace' }}>
          {error?.data?.message || 'UNKNOWN ERROR'}
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
};

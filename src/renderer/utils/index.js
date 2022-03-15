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

export const AsyncError = ({ title = 'Something went wrong', error }) => {
  return (
    <Result
      status="error"
      title={title}
      subTitle={
        <div>
          You may submit this a as an issue on our GitHub page{' '}
          <a href="https://github.com/architecture-building-systems/CityEnergyAnalyst">
            here
          </a>
        </div>
      }
    >
      <div>
        <h3>Error Message:</h3>
        <p>{error?.data?.message || 'UNKNOWN ERROR'}</p>
        {error?.data?.trace && (
          <details>
            <pre style={{ margin: 10 }}>{error.data.trace}</pre>
          </details>
        )}
      </div>
    </Result>
  );
};

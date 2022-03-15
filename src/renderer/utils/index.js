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

export const AsyncError = ({
  title = 'Something went wrong',
  error,
  style = {},
}) => {
  return (
    <div style={style}>
      <h2>{title}</h2>
      <div>ERROR: {error?.data?.message || 'UNKNOWN ERROR'}</div>
      <div>
        You may submit this a as an issue on our GitHub page
        https://github.com/architecture-building-systems/CityEnergyAnalyst
      </div>
      {error?.data?.trace && (
        <details style={{ margin: 10 }}>
          <pre>{error.data.trace}</pre>
        </details>
      )}
    </div>
  );
};

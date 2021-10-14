export function checkNestedProp(obj, prop, ...rest) {
  if (typeof obj[prop] == 'undefined') return false;
  if (rest.length === 0) return true;
  return checkNestedProp(obj[prop], ...rest);
}

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
      <div>
        ERROR:{' '}
        {checkNestedProp(error, 'data', 'message')
          ? error.data.message
          : 'UNKNOWN ERROR'}
      </div>
      {checkNestedProp(error, 'data', 'trace') && (
        <details style={{ margin: 10 }}>
          <pre>{error.data.trace}</pre>
        </details>
      )}
    </div>
  );
};

import React from 'react';
import axios from 'axios';

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
  style = {}
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

const versionRegex = /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[0-9A-Za-z-]+)?/;
export async function fetchOnlineVersion() {
  // Get latest tag from GitHub redirect URL
  try {
    const test = await axios.get(
      'https://github.com/architecture-building-systems/CityEnergyAnalyst/releases/latest'
    );
    return test.request.res.responseUrl.match(versionRegex)[0];
    // Could also use PyPi API (https://pypi.org/pypi/cityenergyanalyst/json)

    // Offical Github API but is rate limiting
    // const resp = await axios.get(
    //   'https://api.github.com/repos/architecture-building-systems/CityEnergyAnalyst/releases/latest'
    // );
    // return resp.data.tag_name.match(versionRegex)[0];
  } catch (err) {
    console.log(err);
    return null;
  }
}

export const versionCompare = (left, right) => {
  // Returns 1 if left has higher version than right else -1
  const verifyVersion = new RegExp(versionRegex);
  if (!verifyVersion.test(left))
    throw `${left} is not in a valid version format.`;
  if (!verifyVersion.test(right))
    throw `${right} is not in a valid version format.`;

  const leftVersion = left.split('.');
  const rightVersion = right.split('.');
  for (let i = 0; i < leftVersion.length; i++) {
    if (leftVersion[i] > rightVersion[i]) return 1;
  }
  return -1;
};

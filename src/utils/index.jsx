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

export function getOperatingSystem() {
  var userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // Detect Windows OS
  if (/windows/i.test(userAgent)) {
    return 'Windows';
  }

  // Detect Mac OS
  if (/macintosh|mac os x/i.test(userAgent)) {
    return 'Mac';
  }

  // Optional: Add more OS detections here (Linux, Android, iOS, etc.)

  return 'Unknown OS';
}

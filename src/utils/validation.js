/**
 * Validation utilities for parameters
 */

/**
 * Debounce function - delays execution until after wait time has elapsed
 * since the last invocation
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Validates network name for invalid filesystem characters
 * @param {string} value - The network name to validate
 * @returns {Promise} Resolves if valid, rejects with error message if invalid
 */
export const validateNetworkNameChars = (value) => {
  const invalidChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
  const hasInvalidChars = invalidChars.some((char) => value.includes(char));

  if (hasInvalidChars) {
    return Promise.reject(
      `Network name contains invalid characters. Avoid: ${invalidChars.join(' ')}`,
    );
  }

  return Promise.resolve();
};

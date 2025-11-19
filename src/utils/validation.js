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

/**
 * Validates network name against backend (collision detection)
 * @param {Object} apiClient - Axios instance for API calls
 * @param {string} tool - Tool name (e.g., 'network-layout')
 * @param {string} value - The network name to validate
 * @param {Object} config - Current config with scenario and network_type
 * @returns {Promise} Resolves if valid, rejects with error message if invalid
 */
export const validateNetworkNameCollision = async (
  apiClient,
  tool,
  value,
  config,
) => {
  try {
    // Call backend to save config with the new network name
    // The backend's decode() method will validate for collisions
    const params = {
      'network-name': value,
      // Include dependencies for validation context
      scenario: config.scenario,
      'network-type': config.network_type,
    };

    await apiClient.post(`/api/tools/${tool}/save-config`, params);
    return Promise.resolve();
  } catch (error) {
    // Backend validation failed - extract error message
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Validation failed';

    return Promise.reject(errorMessage);
  }
};

export const getValidateScenarioNameFunc = (scenarioNames) => {
  return (_, value) => {
    if (scenarioNames.includes(value)) {
      return Promise.reject('Scenario name already exists.');
    }
    // Path traversal and separator checks
    if (value && (/\.\./.test(value) || /\//.test(value) || /\\/.test(value))) {
      return Promise.reject(
        'Scenario name cannot contain characters like "..", "/", or "\\".',
      );
    }
    // Windows invalid characters
    if (value && /[<>:"'|?*]/.test(value)) {
      return Promise.reject(
        'Scenario name cannot contain the characters < > : " \' | ? *',
      );
    }
    // Check length
    if (value && value.length > 255) {
      return Promise.reject('Scenario name cannot exceed 255 characters.');
    }

    return Promise.resolve();
  };
};

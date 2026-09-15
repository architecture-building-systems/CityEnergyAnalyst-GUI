/**
 * Shared rules for any name that becomes a path segment on disk.
 *
 * Scenario names are directories; building names are files
 * (`inputs/building-properties/schedules/{building}.csv`), so both need the same traversal and
 * invalid-character guards. Kept in one place so a rule added for one applies to the other.
 */
const validatePathSegmentName = (value, noun, taken) => {
  if (taken.includes(value)) {
    return Promise.reject(`${noun} already exists.`);
  }
  // Path traversal and separator checks
  if (value && (/\.\./.test(value) || /\//.test(value) || /\\/.test(value))) {
    return Promise.reject(
      `${noun} cannot contain characters like "..", "/", or "\\".`,
    );
  }
  // Windows invalid characters
  if (value && /[<>:"'|?*]/.test(value)) {
    return Promise.reject(
      `${noun} cannot contain the characters < > : " ' | ? *`,
    );
  }
  // Check length
  if (value && value.length > 255) {
    return Promise.reject(`${noun} cannot exceed 255 characters.`);
  }

  return Promise.resolve();
};

export const getValidateScenarioNameFunc = (scenarioNames) => {
  return (_, value) =>
    validatePathSegmentName(value, 'Scenario name', scenarioNames);
};

export const getValidateBuildingNameFunc = (buildingNames) => {
  return (_, value) =>
    validatePathSegmentName(value, 'Building name', buildingNames);
};

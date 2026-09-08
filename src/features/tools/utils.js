// Discriminates a ToolProperties response (returned by GET /tools/{tool}, POST
// .../save-config, and POST .../default) from the legacy plain-string save-config
// response an older backend may still send. `parameters` is always present as an
// array on ToolProperties and is never an array on the legacy body, so callers can
// safely `setQueryData` the response when this is true and fall back to a refetch
// otherwise -- see useSaveToolParams.js / useSetDefaultToolParams.js.
export const isToolProperties = (data) =>
  !!data && typeof data === 'object' && Array.isArray(data.parameters);

// Helper to find categories containing fields with errors
export const getCategoriesWithErrors = (errorFields, categoricalParameters) => {
  if (!errorFields || !categoricalParameters) return [];

  const categories = new Set();
  for (const field of errorFields) {
    const parameterName = field.name.join('.');
    for (const category in categoricalParameters) {
      if (
        categoricalParameters[category].find((x) => x.name === parameterName)
      ) {
        categories.add(category);
        break;
      }
    }
  }
  return [...categories];
};

export const getFormValues = async (
  form,
  parameters,
  categoricalParameters,
  onValidationError,
) => {
  let out = null;
  if (!parameters) return out;

  try {
    const values = await form.validateFields();

    // Convert undefined/null values to empty strings for nullable parameters
    // This ensures backend receives "" instead of undefined/null
    const cleanedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === undefined || value === null ? '' : value,
      ]),
    );

    // No `scenario` key required here: the backend injects it automatically
    // based on the current scenario context.
    out = cleanedValues;

    return out;
  } catch (err) {
    // Ignore out of date error
    if (err?.outOfDate) return null;

    console.error('Form validation error:', err);

    // Call the error handler callback if provided
    if (onValidationError && err?.errorFields) {
      const categoriesToExpand = getCategoriesWithErrors(
        err.errorFields,
        categoricalParameters,
      );
      onValidationError(err, categoriesToExpand);
    }

    // Return null to indicate validation failed
    return null;
  }
};

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

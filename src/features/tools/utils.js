// Helper to find categories containing fields with errors
export const getCategoriesWithErrors = (errorFields, categoricalParameters) => {
  if (!errorFields || !categoricalParameters) return [];

  const categories = [];
  for (const field of errorFields) {
    const parameterName = field.name.join('.');
    for (const category in categoricalParameters) {
      if (
        categoricalParameters[category].find((x) => x.name === parameterName)
      ) {
        categories.push(category);
        break;
      }
    }
  }
  return categories;
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

    // Add scenario information to the form
    const index = parameters.findIndex((x) => x.type === 'ScenarioParameter');
    let scenario = {};
    if (index >= 0) scenario = { scenario: parameters[index].value };

    // Convert undefined/null values to empty strings for nullable parameters
    // This ensures backend receives "" instead of undefined/null
    const cleanedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === undefined || value === null ? '' : value,
      ]),
    );

    out = {
      ...scenario,
      ...cleanedValues,
    };

    return out;
  } catch (err) {
    // Ignore out of date error
    if (err?.outOfDate) return;

    console.error('Error', err);

    // Call the error handler callback if provided
    if (onValidationError && err?.errorFields) {
      const categoriesToExpand = getCategoriesWithErrors(
        err.errorFields,
        categoricalParameters,
      );
      onValidationError(err, categoriesToExpand);

      // Scroll to the first error field after category expansion
      const firstErrorField = err.errorFields[0]?.name;
      if (firstErrorField) {
        setTimeout(() => {
          form.scrollToField(firstErrorField, { focus: true });
        }, 500);
      }
    }

    // Return null to indicate validation failed
    return null;
  }
};

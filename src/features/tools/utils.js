export const getFormValues = async (
  form,
  parameters,
  categoricalParameters = {},
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
    // Expand collapsed categories if errors are found inside
    if (categoricalParameters) {
      let categoriesWithErrors = [];
      for (const parameterName in err) {
        for (const category in categoricalParameters) {
          if (
            typeof categoricalParameters[category].find(
              (x) => x.name === parameterName,
            ) !== 'undefined'
          ) {
            categoriesWithErrors.push(category);
            break;
          }
        }
      }
      // FIXME: show errors in categories
      // categoriesWithErrors.length &&
      //   setActiveKey((oldValue) => oldValue.concat(categoriesWithErrors));
    }
  }
};

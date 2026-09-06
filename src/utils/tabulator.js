export const getColumnPropsFromDataType = (
  columnSchema,
  column = undefined,
) => {
  if (columnSchema?.type === undefined) {
    console.error(
      `Could not find column validation for undefined type for column "${column}"`,
    );
    return {};
  }

  // A nullable number may be cleared. `Number('')` is 0, so an empty cell has to be mapped to
  // null explicitly or clearing one silently writes a zero -- which then reads as a real
  // measurement (a U-value of 0, or zero embodied carbon).
  const numberMutator = (value) =>
    columnSchema?.nullable && (value === '' || value == null)
      ? null
      : Number(value);
  const requiredIfNotNullable = columnSchema?.nullable ? [] : ['required'];

  // Numeric bounds are declared directly on the column in schemas.yml (`min`, `max`,
  // `exclusive_min`). The previous lookup read `columnSchema.constraints`, a key that only
  // exists at table level for cross-column rules, so no bound was ever enforced here -- which
  // is how a U-value of 0 or a service life of 0 reached the file. An empty cell is left to
  // `required`, so a nullable column can still be cleared.
  const withinBound = (predicate) => ({
    type: (cell, value) =>
      value === '' || value == null || predicate(Number(value)),
  });
  const boundValidators = [];
  if (columnSchema?.min != undefined)
    boundValidators.push(withinBound((value) => value >= columnSchema.min));
  if (columnSchema?.max != undefined)
    boundValidators.push(withinBound((value) => value <= columnSchema.max));
  if (columnSchema?.exclusive_min != undefined)
    boundValidators.push(
      withinBound((value) => value > columnSchema.exclusive_min),
    );

  switch (columnSchema.type) {
    case 'int':
    case 'year':
      return {
        editor: 'input',
        validator: [
          ...requiredIfNotNullable,
          'regex:^([1-9][0-9]*|0)$',
          ...boundValidators,
        ],
        mutatorEdit: numberMutator,
      };
    case 'float':
      return {
        editor: 'input',
        validator: [
          ...requiredIfNotNullable,
          'regex:^-?([1-9][0-9]*|0)?(\\.\\d+)?$',
          ...boundValidators,
        ],
        mutatorEdit: numberMutator,
      };
    case 'date':
      return {
        editor: 'input',
        validator: [
          'required',
          'regex:^[0-3][0-9]\\|[0-1][0-9]$',
          { type: simpleDateVal },
        ],
      };
    case 'string':
      return {
        editor: 'input',
        validator: [...requiredIfNotNullable],
      };
    case 'boolean':
      return {
        editor: 'select',
        editorParams: {
          values: [true, false],
        },
        mutator: (value) => !!value,
      };
    case 'Polygon':
      // Ignore polygons for now
      return {};
    default:
      console.error(
        `Could not find column validation for type "${columnSchema.type}" for column "${column}"`,
      );
      return {};
  }
};

const simpleDateVal = (cell, value) => {
  const [date, month] = value.split('|').map((number) => Number(number));
  const daysInMonths = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysInMonths[month] >= date;
};

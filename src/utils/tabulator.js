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

  switch (columnSchema.type) {
    case 'int':
    case 'year':
      return {
        editor: 'input',
        validator: [...requiredIfNotNullable, 'regex:^([1-9][0-9]*|0)$'],
        mutatorEdit: numberMutator,
      };
    case 'float':
      return {
        editor: 'input',
        validator: [
          ...requiredIfNotNullable,
          'regex:^-?([1-9][0-9]*|0)?(\\.\\d+)?$',
          ...(columnSchema?.constraints
            ? Object.keys(columnSchema.constraints).map(
                (constraint) =>
                  `${constraint}:${columnSchema.constraints[constraint]}`,
              )
            : []),
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

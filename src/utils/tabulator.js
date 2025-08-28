export const getColumnPropsFromDataType = (
  columnSchema,
  column = undefined,
) => {
  if (!columnSchema?.type) {
    console.error(
      `Could not find column validation for undefined type for column "${column}"`,
    );
    return {};
  }

  switch (columnSchema.type) {
    case 'int':
    case 'year':
      return {
        editor: 'input',
        validator: ['required', 'regex:^([1-9][0-9]*|0)$'],
        mutatorEdit: (value) => Number(value),
      };
    case 'float':
      return {
        editor: 'input',
        validator: [
          'required',
          'regex:^([1-9][0-9]*|0)?(\\.\\d+)?$',
          ...(columnSchema?.constraints
            ? Object.keys(columnSchema.constraints).map(
                (constraint) =>
                  `${constraint}:${columnSchema.constraints[constraint]}`,
              )
            : []),
        ],
        mutatorEdit: (value) => Number(value),
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
        validator: [...(columnSchema?.nullable ? [] : ['required'])],
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
        `Could not find column validation for type "${dataType}" for column "${column}"`,
      );
      return {};
  }
};

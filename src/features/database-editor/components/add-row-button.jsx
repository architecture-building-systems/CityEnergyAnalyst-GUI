import { Button } from 'antd';
import { CreateNewIcon } from 'assets/icons';
import { useCallback } from 'react';
import { useAddDatabaseRow } from 'features/database-editor/stores/databaseEditorStore';
import { withHiddenInDemo } from 'components/HiddenInDemo';
import { uniqueIndexName } from 'utils/validation';

/**
 * Hook to create an empty row with a unique index
 */
const useAddEmptyRow = (data, dataKey, index, schema) => {
  const addDatabaseRow = useAddDatabaseRow();

  return useCallback(() => {
    if (!index) {
      return null;
    }

    // An empty table is workable as long as the schema supplies the columns — which is the
    // normal state for a database started from a template. Only bail when there is neither
    // a schema nor an existing row to infer the shape from.
    const hasRows = Array.isArray(data)
      ? data.length > 0
      : Object.keys(data ?? {}).length > 0;
    if (!schema?.columns && !hasRows) {
      return null;
    }

    // Get existing indices to ensure uniqueness
    const existingIndices = Array.isArray(data)
      ? data.map((row) => row?.[index])
      : Object.keys(data || {});

    // Generate a unique index name (same _N scheme as renaming)
    const newIndex = uniqueIndexName('NEW_ROW', new Set(existingIndices));

    // Create empty row with all required fields
    const newRow = { [index]: newIndex };

    // Get columns from schema if available, otherwise infer from existing data
    let columns = [];
    if (schema?.columns) {
      columns = Object.keys(schema.columns);
    } else {
      // Infer columns from first row of existing data
      const firstRow = Array.isArray(data) ? data[0] : Object.values(data)[0];
      if (firstRow && typeof firstRow === 'object') {
        columns = Object.keys(firstRow);
      }
    }

    // Initialize all other columns with default values
    columns.forEach((col) => {
      if (col !== index) {
        if (schema?.columns?.[col]) {
          const colSchema = schema.columns[col];
          const type = colSchema?.type;

          // Set default values based on type
          if (type === 'float' || type === 'int') {
            // A nullable number starts empty, not at zero. Zero is a claim -- a U-value of 0
            // or zero embodied carbon -- and seeding it makes a new row contradict whatever
            // the user then fills in, which the envelope cross-check rejects outright.
            newRow[col] = colSchema?.nullable ? null : 0;
          } else if (colSchema?.choice) {
            // Use first available choice or empty string
            const values = colSchema.choice?.values || [];
            newRow[col] = values.length > 0 ? values[0] : '';
          } else {
            newRow[col] = '';
          }
        } else {
          // No schema - infer type from existing data
          const firstRow = Array.isArray(data)
            ? data[0]
            : Object.values(data)[0];
          const sampleValue = firstRow?.[col];

          if (typeof sampleValue === 'number') {
            newRow[col] = 0;
          } else {
            newRow[col] = '';
          }
        }
      }
    });

    addDatabaseRow(dataKey, index, newRow);

    return newRow;
  }, [data, dataKey, index, schema, addDatabaseRow]);
};

const AddRowButtonImpl = ({ data, dataKey, index, schema }) => {
  const addEmptyRow = useAddEmptyRow(data, dataKey, index, schema);

  return (
    <Button icon={<CreateNewIcon />} onClick={addEmptyRow}>
      Add Row
    </Button>
  );
};

export const AddRowButton = withHiddenInDemo(AddRowButtonImpl);

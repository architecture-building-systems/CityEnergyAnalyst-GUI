import { Button } from 'antd';
import { DuplicateIcon } from 'assets/icons';
import { useCallback } from 'react';
import { useAddDatabaseRow } from 'features/database-editor/stores/databaseEditorStore';
import { withHiddenInDemo } from 'components/HiddenInDemo';

/**
 * Hook to handle duplicating rows by copying selected or last row's values
 * and appending "_COPY" to the index value
 */
const useDuplicateRows = (data, dataKey, index, tabulatorRef) => {
  const addDatabaseRow = useAddDatabaseRow();

  return useCallback(() => {
    if (!data || !index) return [];

    let rowsToDuplicate = [];

    // Get selected rows from the table if available
    if (tabulatorRef?.current) {
      const selectedRows = tabulatorRef.current.getSelectedRows();
      if (selectedRows.length > 0) {
        rowsToDuplicate = selectedRows.map((row) => row.getData());
      }
    }

    // Fall back to last row if no rows are selected
    if (rowsToDuplicate.length === 0) {
      let lastRow;
      let lastIndex;

      if (Array.isArray(data)) {
        if (data.length === 0) return [];
        lastRow = data[data.length - 1];
        lastIndex = lastRow?.[index];
      } else if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length === 0) return [];
        lastIndex = keys[keys.length - 1];
        lastRow = { [index]: lastIndex, ...data[lastIndex] };
      } else {
        return [];
      }

      if (!lastRow) return [];
      rowsToDuplicate = [lastRow];
    }

    // Get existing indices
    const existingIndices = Array.isArray(data)
      ? data.map((row) => row?.[index])
      : Object.keys(data);

    const newRows = [];

    // Duplicate each row
    rowsToDuplicate.forEach((rowToDuplicate) => {
      const originalIndex = rowToDuplicate[index];
      const newRow = { ...rowToDuplicate };

      // Generate a unique index with "_COPY" suffix
      let newIndex = `${originalIndex}_COPY`;
      let counter = 1;

      // Ensure the new index is unique
      const allIndices = [...existingIndices, ...newRows.map((r) => r[index])];
      while (allIndices.includes(newIndex)) {
        newIndex = `${originalIndex}_COPY${counter}`;
        counter++;
      }

      newRow[index] = newIndex;

      // Add the new row to the database with 'duplicate' action
      addDatabaseRow(dataKey, index, newRow, 'duplicate');
      newRows.push(newRow);
    });

    return newRows;
  }, [data, dataKey, index, addDatabaseRow, tabulatorRef]);
};

const DuplicateRowButtonImpl = ({
  data,
  dataKey,
  index,
  tabulatorRef,
  selectedCount = 0,
}) => {
  const duplicateRows = useDuplicateRows(data, dataKey, index, tabulatorRef);

  // Don't show button if no rows are selected
  if (!selectedCount || selectedCount === 0) {
    return null;
  }

  // Show count in button text when multiple rows are selected
  const buttonText =
    selectedCount > 1 ? `Duplicate Row (${selectedCount})` : 'Duplicate Row';

  return (
    <Button icon={<DuplicateIcon />} onClick={duplicateRows}>
      {buttonText}
    </Button>
  );
};

export const DuplicateRowButton = withHiddenInDemo(DuplicateRowButtonImpl);

import { Button, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { BinAnimationIcon } from 'assets/icons';
import { ERROR_RED } from 'constants/theme';
import { useCallback } from 'react';
import { useDeleteDatabaseRows } from 'features/database-editor/stores/databaseEditorStore';
import { DeleteModalContent } from './delete-modal-content';
import { withHiddenInDemo } from 'components/HiddenInDemo';

/**
 * Hook to handle deleting selected rows
 */
const useDeleteRows = (dataKey, index, tabulatorRef) => {
  const deleteDatabaseRows = useDeleteDatabaseRows();

  return useCallback(() => {
    if (!index || !tabulatorRef?.current) return [];

    // Get selected rows from the table
    const selectedRows = tabulatorRef.current.getSelectedRows();
    if (selectedRows.length === 0) return [];

    // Check if this is a nested structure (USE types or CONVERSION components)
    const isNestedStructure =
      (dataKey.length >= 3 &&
        dataKey[0] === 'ARCHETYPES' &&
        dataKey[1] === 'USE') ||
      (dataKey.length >= 4 &&
        dataKey[0] === 'COMPONENTS' &&
        dataKey[1] === 'CONVERSION');

    // For nested structures, use row positions instead of index values
    // because rows within a component may have duplicate index values
    const rowIndices = isNestedStructure
      ? selectedRows.map((row) => row.getPosition())
      : selectedRows.map((row) => row.getData()[index]);

    // Delete rows from the database
    deleteDatabaseRows(dataKey, index, rowIndices);

    return rowIndices;
  }, [dataKey, index, deleteDatabaseRows, tabulatorRef]);
};

const DeleteRowButtonImpl = ({
  dataKey,
  index,
  tabulatorRef,
  selectedCount = 0,
}) => {
  const deleteRows = useDeleteRows(dataKey, index, tabulatorRef);

  const handleClick = () => {
    const rowCount = selectedCount;

    Modal.confirm({
      title: `Delete Selected Rows (${rowCount})?`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <DeleteModalContent customMessage="Deleting these rows will not automatically update other tables that may reference them. You may need to manually check and update related data in other tables." />
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: deleteRows,
    });
  };

  // Don't show button if no rows are selected
  if (!selectedCount || selectedCount === 0) {
    return null;
  }

  // Show count in button text when multiple rows are selected
  const buttonText =
    selectedCount > 1 ? `Delete Row (${selectedCount})` : 'Delete Row';

  // The bin's colour is set inline because antd's `.ant-btn .ant-btn-icon > svg { color: inherit }`
  // outranks the SVG's own fill: `danger` alone would tint it antd's red, not CEA's. Same reason
  // every other `BinAnimationIcon` call site in the app sets it explicitly.
  return (
    <Button
      danger
      icon={<BinAnimationIcon style={{ color: ERROR_RED }} />}
      onClick={handleClick}
    >
      {buttonText}
    </Button>
  );
};

export const DeleteRowButton = withHiddenInDemo(DeleteRowButtonImpl);

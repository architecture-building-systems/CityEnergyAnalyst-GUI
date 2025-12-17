import { Button, Modal } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useCallback } from 'react';
import { useDeleteDatabaseRows } from 'features/database-editor/stores/databaseEditorStore';
import { DeleteModalContent } from './delete-modal-content';

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

    // Extract indices from selected rows
    const rowIndices = selectedRows.map((row) => row.getData()[index]);

    // Delete rows from the database
    deleteDatabaseRows(dataKey, index, rowIndices);

    return rowIndices;
  }, [dataKey, index, deleteDatabaseRows, tabulatorRef]);
};

export const DeleteRowButton = ({
  dataKey,
  index,
  tabulatorRef,
  onDeleteRow,
  selectedCount = 0,
}) => {
  const deleteRows = useDeleteRows(dataKey, index, tabulatorRef);

  const handleClick = () => {
    const rowCount = selectedCount;

    Modal.confirm({
      title: `Delete Selected Rows (${rowCount})?`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <DeleteModalContent
          customMessage="Deleting these rows will not automatically update other tables that may reference them. You may need to manually check and update related data in other tables."
        />
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        const deletedIndices = deleteRows();
        if (deletedIndices.length > 0 && onDeleteRow) {
          onDeleteRow(deletedIndices);
        }
      },
    });
  };

  // Don't show button if no rows are selected
  if (!selectedCount || selectedCount === 0) {
    return null;
  }

  // Show count in button text when multiple rows are selected
  const buttonText =
    selectedCount > 1 ? `Delete Row (${selectedCount})` : 'Delete Row';

  return (
    <Button danger icon={<DeleteOutlined />} onClick={handleClick}>
      {buttonText}
    </Button>
  );
};

/**
 * Standardized delete confirmation modal content
 * Used across all delete operations in the database editor
 */
export const DeleteModalContent = ({ customMessage }) => {
  const defaultMessage =
    'Deleting this will not automatically update other data that may reference it. You may need to manually check and update related data in other tables.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <b>Warning:</b> {customMessage || defaultMessage}
      </div>
      <b>This action cannot be undone.</b>
    </div>
  );
};

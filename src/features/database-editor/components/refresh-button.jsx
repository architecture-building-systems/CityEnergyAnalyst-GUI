import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';
import { Button, Tooltip } from 'antd';
import { RefreshIcon } from 'assets/icons';

export const RefreshDatabaseButton = () => {
  const { status } = useDatabaseEditorStore((state) => state.status);
  const initDatabaseState = useDatabaseEditorStore(
    (state) => state.initDatabaseState,
  );

  if (status === 'fetching') return null;

  return (
    <Tooltip title="Refresh Database">
      <div className="cea-card-icon-button-container">
        <Button
          type="text"
          icon={<RefreshIcon />}
          onClick={() => {
            initDatabaseState();
          }}
        />
      </div>
    </Tooltip>
  );
};

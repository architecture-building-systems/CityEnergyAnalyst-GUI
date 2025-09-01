import useDatabaseEditorStore, {
  FETCHING_STATUS,
  SAVING_STATUS,
} from 'features/database-editor/stores/databaseEditorStore';
import { Button, Tooltip } from 'antd';
import { RefreshIcon } from 'assets/icons';

export const RefreshDatabaseButton = () => {
  const { status } = useDatabaseEditorStore((state) => state.status);
  const initDatabaseState = useDatabaseEditorStore(
    (state) => state.initDatabaseState,
  );
  const resetDatabaseChanges = useDatabaseEditorStore(
    (state) => state.resetDatabaseChanges,
  );

  if ([SAVING_STATUS, FETCHING_STATUS].includes(status)) return null;

  const refreshDatabase = async () => {
    initDatabaseState();
    resetDatabaseChanges();
  };

  return (
    <Tooltip title="Reload Database">
      <div className="cea-card-icon-button-container">
        <Button type="text" icon={<RefreshIcon />} onClick={refreshDatabase} />
      </div>
    </Tooltip>
  );
};

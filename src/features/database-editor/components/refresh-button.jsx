import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';
import { Button } from 'antd';

export const RefreshDatabaseButton = () => {
  const { status } = useDatabaseEditorStore((state) => state.status);
  const initDatabaseState = useDatabaseEditorStore(
    (state) => state.initDatabaseState,
  );

  if (status === 'fetching') return null;

  return (
    <Button
      onClick={() => {
        initDatabaseState();
      }}
    >
      Refresh
    </Button>
  );
};

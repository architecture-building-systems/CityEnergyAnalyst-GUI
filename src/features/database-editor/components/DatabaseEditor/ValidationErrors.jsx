import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';
import { Alert } from 'antd';
import { withErrorBoundary } from 'utils/ErrorBoundary';

const ValidationErrors = ({ databaseName }) => {
  const validation = useDatabaseEditorStore((state) => state.validation);
  if (typeof validation[databaseName] === 'undefined') return null;

  return (
    <div style={{ margin: 10 }}>
      <Alert
        message="Errors Found in Database"
        description={
          <div>
            {Object.keys(validation[databaseName]).map((sheet) => {
              const rows = validation[databaseName][sheet];
              return (
                <div key={sheet}>
                  {Object.keys(rows).map((row) => (
                    <div key={row}>
                      <i>Sheet: </i>
                      <b>{sheet} </b>
                      <i>Row: </i>
                      <b>{row} </b>
                      <i>Columns: </i>
                      <b>{Object.keys(rows[row]).join(', ')}</b>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        }
        type="error"
      />
    </div>
  );
};

export default withErrorBoundary(ValidationErrors);

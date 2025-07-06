import { Provider } from 'react-redux';
import DatabaseEditor from '../components/DatabaseEditor/DatabaseEditor';
import databaseEditorStore from '../stores/databaseReduxStore';

const DatabaseEditorWithRedux = () => {
  return (
    <Provider store={databaseEditorStore}>
      <DatabaseEditor />
    </Provider>
  );
};

export default DatabaseEditorWithRedux;
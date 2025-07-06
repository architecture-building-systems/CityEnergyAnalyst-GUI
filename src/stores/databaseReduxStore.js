import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import databaseEditor from '../reducers/databaseEditor';

// Minimal Redux store for DatabaseEditor only
const databaseEditorStore = createStore(
  databaseEditor,
  applyMiddleware(thunk)
);

export default databaseEditorStore;
import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';

import project from './project';
import { toolList, toolParams, toolSaving } from './tools';
import jobs from './jobs';
import databaseEditor from './databaseEditor';

export default function createRootReducer(history) {
  return combineReducers({
    router: connectRouter(history),
    project,
    toolList,
    toolParams,
    toolSaving,
    jobs,
    databaseEditor,
  });
}

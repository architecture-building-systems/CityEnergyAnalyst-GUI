import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';

import sider from './homepage';
import project from './project';
import { toolList, toolParams, toolSaving } from './tools';
import inputData from './inputEditor';
import jobs from './jobs';
import databaseData from './databaseEditor';

export default function createRootReducer(history) {
  return combineReducers({
    router: connectRouter(history),
    sider,
    project,
    toolList,
    toolParams,
    toolSaving,
    inputData,
    jobs,
    databaseData
  });
}

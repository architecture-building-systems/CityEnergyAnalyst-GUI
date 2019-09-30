import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';

import sider from './homepage';
import project from './project';
import { toolList, toolParams, toolSaving } from './tools';
import inputData from './inputEditor';
import dashboard from './dashboard';
import jobs from './jobs';

export default function createRootReducer(history) {
  return combineReducers({
    router: connectRouter(history),
    sider,
    project,
    toolList,
    toolParams,
    toolSaving,
    inputData,
    dashboard,
    jobs
  });
}

import {
  FETCH_DASHBOARDS,
  SHOW_MODAL_ADD_PLOT,
  SHOW_MODAL_CHANGE_PLOT,
  SHOW_MODAL_DELETE_DASHBOARD,
  SHOW_MODAL_DELETE_PLOT,
  SHOW_MODAL_DUPLICATE_DASHBOARD,
  SHOW_MODAL_EDIT_PARAMETERS,
  SHOW_MODAL_NEW_DASHBOARD,
  SHOW_MODAL_SET_SCENARIO
} from '../actions/dashboard';

const initialState = {
  fetchingDashboards: true,
  showModalNewDashboard: false,
  showModalDuplicateDashboard: false,
  showModalSetScenario: false,
  showModalDeleteDashboard: false,
  showModalAddPlot: false,
  showModalChangePlot: false,
  showModalEditParameters: false,
  showModalDeletePlot: false,
  activePlot: { dashIndex: null, index: null }
};

const dashboard = (state = initialState, { type, payload }) => {
  switch (type) {
    case FETCH_DASHBOARDS:
      return { ...state, ...payload };
    case SHOW_MODAL_NEW_DASHBOARD:
      return { ...state, ...payload };
    case SHOW_MODAL_DUPLICATE_DASHBOARD:
      return { ...state, ...payload };
    case SHOW_MODAL_SET_SCENARIO:
      return { ...state, ...payload };
    case SHOW_MODAL_DELETE_DASHBOARD:
      return { ...state, ...payload };
    case SHOW_MODAL_ADD_PLOT:
      return { ...state, ...payload };
    case SHOW_MODAL_CHANGE_PLOT:
      return { ...state, ...payload };
    case SHOW_MODAL_EDIT_PARAMETERS:
      return { ...state, ...payload };
    case SHOW_MODAL_DELETE_PLOT:
      return { ...state, ...payload };
    default:
      return state;
  }
};

export default dashboard;

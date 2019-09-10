export const FETCH_DASHBOARDS = 'FETCH_DASHBOARDS';
export const fetchDashboards = fetch => {
  return {
    type: FETCH_DASHBOARDS,
    payload: { fetchingDashboards: fetch }
  };
};

export const SHOW_MODAL_NEW_DASHBOARD = 'SHOW_MODAL_NEW_DASHBOARD';
export const setModalNewDashboardVisibility = visible => {
  return {
    type: SHOW_MODAL_NEW_DASHBOARD,
    payload: { showModalNewDashboard: visible }
  };
};

export const SHOW_MODAL_DUPLICATE_DASHBOARD = 'SHOW_MODAL_DUPLICATE_DASHBOARD';
export const setModalDuplicateDashboardVisibility = visible => {
  return {
    type: SHOW_MODAL_DUPLICATE_DASHBOARD,
    payload: { showModalDuplicateDashboard: visible }
  };
};

export const SHOW_MODAL_SET_SCENARIO = 'SHOW_MODAL_SET_SCENARIO';
export const setModalSetScenarioVisibility = visible => {
  return {
    type: SHOW_MODAL_SET_SCENARIO,
    payload: { showModalSetScenario: visible }
  };
};

export const SHOW_MODAL_DELETE_DASHBOARD = 'SHOW_MODAL_DELETE_DASHBOARD';
export const setModalDeleteDashboardVisibility = visible => {
  return {
    type: SHOW_MODAL_DELETE_DASHBOARD,
    payload: { showModalDeleteDashboard: visible }
  };
};

export const SHOW_MODAL_ADD_PLOT = 'SHOW_MODAL_ADD_PLOT';
export const setModalAddPlotVisibility = (visible, dashIndex, index) => {
  return {
    type: SHOW_MODAL_ADD_PLOT,
    payload: { showModalAddPlot: visible, activePlot: { dashIndex, index } }
  };
};

export const SHOW_MODAL_CHANGE_PLOT = 'SHOW_MODAL_CHANGE_PLOT';
export const setModalChangePlotVisibility = (visible, dashIndex, index) => {
  return {
    type: SHOW_MODAL_CHANGE_PLOT,
    payload: { showModalChangePlot: visible, activePlot: { dashIndex, index } }
  };
};

export const SHOW_MODAL_EDIT_PARAMETERS = 'SHOW_MODAL_EDIT_PARAMETERS';
export const setModalEditParametersVisibility = (visible, dashIndex, index) => {
  return {
    type: SHOW_MODAL_EDIT_PARAMETERS,
    payload: {
      showModalEditParameters: visible,
      activePlot: { dashIndex, index }
    }
  };
};

export const SHOW_MODAL_DELETE_PLOT = 'SHOW_MODAL_DELETE_PLOT';
export const setModalDeletePlotVisibility = (visible, dashIndex, index) => {
  return {
    type: SHOW_MODAL_DELETE_PLOT,
    payload: {
      showModalDeletePlot: visible,
      activePlot: { dashIndex, index }
    }
  };
};

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button, Select } from 'antd';
import axios from 'axios';
import {
  ModalAddPlot,
  ModalChangePlot,
  ModalDeleteDashboard,
  ModalDeletePlot,
  ModalDuplicateDashboard,
  ModalEditParameters,
  ModalNewDashboard,
  ModalSetScenario
} from './Modals';
import { RowLayout, GridLayout } from './Layouts';
import {
  setModalDeleteDashboardVisibility,
  setModalDuplicateDashboardVisibility,
  setModalNewDashboardVisibility,
  setModalSetScenarioVisibility,
  fetchDashboards
} from '../../actions/dashboard';
import './Dashboard.css';

const { Option } = Select;

const Dashboard = () => {
  const fetchingDashboards = useSelector(
    state => state.dashboard.fetchingDashboards
  );
  const [dashboards, setDashboards] = useState([]);
  const [dashIndex, setDashIndex] = useState(0);
  const dispatch = useDispatch();

  const showModalNewDashboard = () =>
    dispatch(setModalNewDashboardVisibility(true));

  const showModalDuplicateDashboard = () =>
    dispatch(setModalDuplicateDashboardVisibility(true));

  const showModalSetScenario = () =>
    dispatch(setModalSetScenarioVisibility(true));

  const showModalDeleteDashboard = () =>
    dispatch(setModalDeleteDashboardVisibility(true));

  const dependenciesMounted = usePlotDependencies();

  const handleSelect = useCallback(index => {
    setDashIndex(index);
  }, []);

  useEffect(() => {
    !fetchingDashboards && dispatch(fetchDashboards(true));
  }, []);

  useEffect(() => {
    if (fetchingDashboards) {
      axios.get('http://localhost:5050/api/dashboard/').then(response => {
        setDashboards(response.data);
        dispatch(fetchDashboards(false));
      });
    }
  }, [fetchingDashboards]);

  if (!dashboards.length || !dependenciesMounted) return null;

  const { layout, plots } = dashboards[dashIndex];
  const dashboardNames = dashboards.map(dashboard => dashboard.name);

  return (
    <React.Fragment>
      <div id="cea-dashboard-content" style={{ minHeight: '100%' }}>
        <div id="cea-dashboard-content-title" style={{ margin: 5 }}>
          <DashSelect
            dashIndex={dashIndex}
            setDashIndex={handleSelect}
            dashboardNames={dashboardNames}
          />
          <div className="cea-dashboard-title-button-group">
            <Button
              type="primary"
              icon="plus"
              size="small"
              onClick={showModalNewDashboard}
            >
              New Dashboard
            </Button>
            <Button
              type="primary"
              icon="copy"
              size="small"
              onClick={showModalDuplicateDashboard}
            >
              Duplicate Dashboard
            </Button>
            <Button
              type="primary"
              icon="edit"
              size="small"
              onClick={showModalSetScenario}
            >
              Set Scenario
            </Button>
            <Button
              type="danger"
              icon="delete"
              size="small"
              onClick={showModalDeleteDashboard}
            >
              Delete Dashboard
            </Button>
          </div>
        </div>
        <div id="cea-dashboard-layout">
          {layout === 'row' ? (
            <RowLayout dashIndex={dashIndex} plots={plots} />
          ) : (
            <GridLayout
              dashIndex={dashIndex}
              plots={plots}
              grid_width={dashboards[dashIndex].grid_width}
            />
          )}
        </div>
      </div>
      <ModalNewDashboard
        setDashIndex={handleSelect}
        dashboardNames={dashboardNames}
      />
      <ModalDuplicateDashboard
        dashIndex={dashIndex}
        setDashIndex={handleSelect}
        dashboardNames={dashboardNames}
      />
      <ModalSetScenario dashIndex={dashIndex} />
      <ModalDeleteDashboard dashIndex={dashIndex} setDashIndex={handleSelect} />
      <ModalAddPlot />
      <ModalChangePlot />
      <ModalEditParameters />
      <ModalDeletePlot />
    </React.Fragment>
  );
};

const DashSelect = React.memo(({ dashIndex, setDashIndex, dashboardNames }) => {
  const dashList = useMemo(
    () =>
      dashboardNames.map((name, index) => (
        <Option key={index} value={index}>
          {name}
        </Option>
      )),
    [dashboardNames]
  );

  return (
    <Select
      value={dashboardNames[dashIndex]}
      style={{ width: 200, marginRight: 20 }}
      onChange={value => setDashIndex(value)}
    >
      {dashList}
    </Select>
  );
});

const usePlotDependencies = () => {
  const deckRef = useRef();
  const [isMounted, setIsMounted] = useState(false);
  const PlotDependencies = [
    ['script', 'https://cdn.plot.ly/plotly-latest.min.js'],
    ['script', 'https://unpkg.com/deck.gl@latest/dist.min.js'],
    ['script', 'https://api.tiles.mapbox.com/mapbox-gl-js/v1.2.0/mapbox-gl.js'],
    ['script', 'https://npmcdn.com/@turf/turf/turf.min.js'],
    ['script', 'https://code.jquery.com/jquery-3.4.1.min.js'],
    [
      'script',
      'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js'
    ],
    [
      'link',
      'https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap-grid.min.css'
    ]
  ];

  const menuToggle = document.querySelector('.menu-toggle');
  const resizePlots = () => {
    const plots = document.querySelectorAll('.plotly-graph-div.js-plotly-plot');
    for (let plot of plots) {
      window.Plotly.Plots.resize(plot.id);
    }
  };
  const mountNodes = (tag, url) => {
    const element = document.createElement(tag);
    element.setAttribute(tag === 'script' ? 'src' : 'href', url);
    tag === 'link' && element.setAttribute('rel', 'stylesheet');
    document.body.prepend(element);
    return element;
  };

  useEffect(() => {
    // Store original deck reference
    deckRef.current = window.deck;
    window.deck = null;
    window.addEventListener('resize', resizePlots);
    menuToggle.addEventListener('click', resizePlots);
    const scripts = PlotDependencies.map(dependency =>
      mountNodes(...dependency)
    );
    setIsMounted(true);

    return () => {
      window.deck = deckRef.current;
      window.removeEventListener('resize', resizePlots);
      menuToggle.removeEventListener('click', resizePlots);
      scripts.map(dependency => dependency.remove());
    };
  }, []);

  return isMounted;
};

export default Dashboard;

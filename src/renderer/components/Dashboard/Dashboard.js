import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
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
import { ModalContext, ModalManager } from '../../utils/ModalManager';
import { RowLayout, GridLayout } from './Layouts';
import './Dashboard.css';
import { withErrorBoundary } from '../../utils/ErrorBoundary';

const { Option } = Select;
const modals = {
  addPlot: 'addPlot',
  changePlot: 'changePlot',
  deleteDashboard: 'deleteDashboard',
  deletePlot: 'deletePlot',
  duplicateDashboard: 'duplicateDashboard',
  editParameters: 'editParameters',
  newDashboard: 'newDashboard',
  setScenario: 'setScenario'
};

const Dashboard = () => {
  const [dashIndex, setDashIndex] = useState(0);
  const { dashboards, fetchDashboards, categories } = useDashboardData();
  const dependenciesMounted = usePlotDependencies();

  const activePlotRef = useRef(0);

  if (!dashboards.length || !dependenciesMounted) return null;

  const { layout, plots } = dashboards[dashIndex];
  const dashboardNames = dashboards.map(dashboard => dashboard.name);

  return (
    <ModalManager modals={modals}>
      <div id="cea-dashboard-content" style={{ minHeight: '100%' }}>
        <div id="cea-dashboard-content-title" style={{ margin: 5 }}>
          <DashSelect
            dashIndex={dashIndex}
            setDashIndex={setDashIndex}
            dashboardNames={dashboardNames}
          />
          <DashButtons />
        </div>
        <div id="cea-dashboard-layout">
          {layout === 'row' ? (
            <RowLayout
              dashIndex={dashIndex}
              plots={plots}
              activePlotRef={activePlotRef}
            />
          ) : (
            <GridLayout
              dashIndex={dashIndex}
              plots={plots}
              grid_width={dashboards[dashIndex].grid_width}
              activePlotRef={activePlotRef}
            />
          )}
        </div>
      </div>
      <ModalNewDashboard
        fetchDashboards={fetchDashboards}
        setDashIndex={setDashIndex}
        dashboardNames={dashboardNames}
      />
      <ModalDuplicateDashboard
        fetchDashboards={fetchDashboards}
        dashIndex={dashIndex}
        setDashIndex={setDashIndex}
        dashboardNames={dashboardNames}
      />
      <ModalSetScenario
        fetchDashboards={fetchDashboards}
        dashIndex={dashIndex}
      />
      <ModalDeleteDashboard
        fetchDashboards={fetchDashboards}
        dashIndex={dashIndex}
        setDashIndex={setDashIndex}
      />
      <ModalAddPlot
        activePlotRef={activePlotRef}
        dashIndex={dashIndex}
        fetchDashboards={fetchDashboards}
        categories={categories}
      />
      <ModalChangePlot
        activePlotRef={activePlotRef}
        dashIndex={dashIndex}
        fetchDashboards={fetchDashboards}
        categories={categories}
      />
      <ModalEditParameters
        activePlotRef={activePlotRef}
        dashIndex={dashIndex}
        fetchDashboards={fetchDashboards}
      />
      <ModalDeletePlot
        activePlotRef={activePlotRef}
        dashIndex={dashIndex}
        fetchDashboards={fetchDashboards}
      />
    </ModalManager>
  );
};

const DashSelect = ({ dashIndex, setDashIndex, dashboardNames }) => {
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
      value={dashIndex}
      style={{ width: 200, marginRight: 20 }}
      onChange={value => setDashIndex(value)}
    >
      {dashList}
    </Select>
  );
};

const DashButtons = () => {
  const { setModalVisible, modals } = useContext(ModalContext);
  return (
    <div className="cea-dashboard-title-button-group">
      <Button
        type="primary"
        icon="plus"
        size="small"
        onClick={() => setModalVisible(modals.newDashboard, true)}
      >
        New Dashboard
      </Button>
      <Button
        type="primary"
        icon="copy"
        size="small"
        onClick={() => setModalVisible(modals.duplicateDashboard, true)}
      >
        Duplicate Dashboard
      </Button>
      <Button
        type="primary"
        icon="edit"
        size="small"
        onClick={() => setModalVisible(modals.setScenario, true)}
      >
        Set Scenario
      </Button>
      <Button
        type="danger"
        icon="delete"
        size="small"
        onClick={() => setModalVisible(modals.deleteDashboard, true)}
      >
        Delete Dashboard
      </Button>
    </div>
  );
};

const useDashboardData = () => {
  const [dashboards, setDashboards] = useState([]);
  const [categories, setCategories] = useState([]);

  const fetchDashboards = async () => {
    try {
      const resp = await axios.get('http://localhost:5050/api/dashboards/');
      setDashboards(resp.data);
    } catch (error) {
      console.log(error);
    }
  };
  const fetchCategories = async () => {
    try {
      const resp = await axios.get(
        'http://localhost:5050/api/dashboards/plot-categories'
      );
      setCategories(resp.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchDashboards();
    fetchCategories();
  }, []);
  return { dashboards, fetchDashboards, categories };
};

const usePlotDependencies = () => {
  const deckRef = useRef();
  const [isMounted, setIsMounted] = useState(false);
  const PlotDependencies = [
    ['script', 'https://cdn.plot.ly/plotly-latest.min.js'],
    [
      'script',
      `https://unpkg.com/deck.gl@${
        window.deck ? window.deck.version : 'latest'
      }/dist.min.js`
    ],
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

export default withErrorBoundary(Dashboard);

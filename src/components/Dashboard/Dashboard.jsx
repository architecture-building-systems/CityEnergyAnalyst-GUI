import { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { apiClient } from '../../api/axios';
import {
  ModalAddPlot,
  ModalChangePlot,
  ModalDeleteDashboard,
  ModalDeletePlot,
  ModalDuplicateDashboard,
  ModalEditParameters,
  ModalNewDashboard,
  ModalPlotFiles,
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
  setScenario: 'setScenario',
  plotFiles: 'plotFiles',
};

const Dashboard = () => {
  const [dashIndex, setDashIndex] = useState(0);
  const { dashboards, fetchDashboards, categories } = useDashboardData();
  const dependenciesMounted = usePlotDependencies();

  const activePlotRef = useRef(0);

  if (!dashboards.length || !dependenciesMounted) return null;

  const { layout, plots } = dashboards[dashIndex];
  const dashboardNames = dashboards.map((dashboard) => dashboard.name);

  return (
    <ModalManager modals={modals}>
      <div id="cea-dashboard-content">
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
      <ModalPlotFiles activePlotRef={activePlotRef} dashIndex={dashIndex} />
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
    [dashboardNames],
  );

  return (
    <Select
      value={dashIndex}
      style={{ width: 200, marginRight: 20 }}
      onChange={(value) => setDashIndex(value)}
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
        icon={<PlusOutlined />}
        size="small"
        onClick={() => setModalVisible(modals.newDashboard, true)}
      >
        New Dashboard
      </Button>
      <Button
        type="primary"
        icon={<CopyOutlined />}
        size="small"
        onClick={() => setModalVisible(modals.duplicateDashboard, true)}
      >
        Duplicate Dashboard
      </Button>
      <Button
        danger
        icon={<DeleteOutlined />}
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
      const resp = await apiClient.get(`/api/dashboards/`);
      setDashboards(resp.data);
    } catch (error) {
      console.error(error);
    }
  };
  const fetchCategories = async () => {
    try {
      const resp = await apiClient.get(`/api/dashboards/plot-categories`);
      setCategories(resp.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDashboards();
    fetchCategories();
  }, []);
  return { dashboards, fetchDashboards, categories };
};

export const usePlotDependencies = () => {
  const [isMounted, setIsMounted] = useState(false);
  const PlotDependencies = [
    ['script', 'https://cdn.plot.ly/plotly-latest.min.js'],
    [
      'script',
      `https://unpkg.com/deck.gl@${
        window.deck ? window.deck.version : 'latest'
      }/dist.min.js`,
    ],
    ['script', 'https://api.tiles.mapbox.com/mapbox-gl-js/v1.2.0/mapbox-gl.js'],
    ['script', 'https://unpkg.com/@turf/turf@6/turf.min.js'],
  ];

  const menuToggle = document.querySelector('.menu-toggle');
  const resizePlots = () => {
    const plots = document.querySelectorAll('.plotly-graph-div.js-plotly-plot');
    for (let plot of plots) {
      window.Plotly.Plots.resize(plot.id);
    }
  };
  // Use promise to check if script is loaded
  const scriptLoadedListener = (element) =>
    // eslint-disable-next-line
    new Promise((resolve, reject) => {
      const scriptLoaded = () => {
        element.removeEventListener('load', scriptLoaded);
        resolve();
      };
      element.addEventListener('load', scriptLoaded);
    });
  const mountNodes = (tag, url, scriptPromises) => {
    const element = document.createElement(tag);
    element.setAttribute('src', url);
    scriptPromises.push(scriptLoadedListener(element));
    document.body.prepend(element);
    return element;
  };

  useEffect(() => {
    // Remove any deck references
    delete window.deck;
    window.addEventListener('resize', resizePlots);
    menuToggle && menuToggle.addEventListener('click', resizePlots);
    let scriptPromises = [];
    const scripts = PlotDependencies.map((dependency) =>
      mountNodes(...dependency, scriptPromises),
    );
    // eslint-disable-next-line
    Promise.all(scriptPromises).then((values) => {
      // Return true only once all scripts have been loaded
      setIsMounted(true);
    });

    return () => {
      // Prevent any luma version conflicts
      delete window.luma;
      delete window.deck;
      window.removeEventListener('resize', resizePlots);
      menuToggle && menuToggle.removeEventListener('click', resizePlots);
      scripts.map((dependency) => dependency.remove());
    };
  }, []);

  return isMounted;
};

export default withErrorBoundary(Dashboard);

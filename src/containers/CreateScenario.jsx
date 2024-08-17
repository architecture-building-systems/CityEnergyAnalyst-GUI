import { Col, Divider, List, Row, Steps } from 'antd';
import { lazy, memo, useCallback, useEffect, useRef, useState } from 'react';
import NameForm from '../components/Project/CreateScenarioForms/NameForm';
import DatabaseForm from '../components/Project/CreateScenarioForms/DatabaseForm';
import GeometryForm from '../components/Project/CreateScenarioForms/GeometryForm';
import TypologyForm from '../components/Project/CreateScenarioForms/TypologyForm';
import ContextForm from '../components/Project/CreateScenarioForms/ContextForm';
import { useSelector } from 'react-redux';
import {
  MapFormContext,
  useFetchDatabases,
  useFetchWeather,
} from '../components/Project/CreateScenarioForms/hooks';

const EditableMap = lazy(() => import('../components/Map/EditableMap'));

const CreateScenarioForm = memo(({ setSecondary }) => {
  const [current, setCurrent] = useState(0);
  const [data, setData] = useState({});
  const databases = useFetchDatabases();
  const weather = useFetchWeather();

  const onChange = (values) => {
    setData({ ...data, ...values });
  };

  const onBack = () => {
    setCurrent(current - 1);
  };

  const onFinish = (values) => {
    if (current < forms.length - 1) {
      setData({ ...data, ...values });
      setCurrent(current + 1);
    } else {
      const allFormData = { ...data, ...values };
      setData(allFormData);
      console.log(allFormData);
    }
  };

  const forms = [
    {
      description: 'Name',
      content: (
        <NameForm
          initialValues={data}
          onFinish={onFinish}
          onMount={() => setSecondary('scenarioList')}
        />
      ),
    },
    {
      description: 'Database',
      content: (
        <DatabaseForm
          databases={databases}
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
          onMount={() => setSecondary()}
        />
      ),
    },
    {
      description: 'Geometries',
      content: (
        <GeometryForm
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
          setSecondary={setSecondary}
        />
      ),
    },
    {
      description: 'Typology',
      content: (
        <TypologyForm
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
          onMount={() => setSecondary()}
        />
      ),
    },
    {
      description: 'Context',
      content: (
        <ContextForm
          weather={weather}
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
          onMount={() => setSecondary()}
        />
      ),
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 24,
        boxSizing: 'border-box',
        border: '1px solid #eee',
        borderRadius: 8,
        minWidth: 600,
        background: '#fff',
        marginLeft: 24,
      }}
    >
      <div>
        <h2>Create Scenario</h2>
        <p>Adds a new Scenario to the current Project.</p>
        <Divider />
      </div>
      <div style={{ flexGrow: 1 }}>{forms[current].content}</div>
      <div style={{ marginTop: 24 }}>
        <Steps
          current={current}
          labelPlacement="vertical"
          items={forms}
          size="small"
        />
      </div>
    </div>
  );
});

const ScenarioList = () => {
  const { info } = useSelector((state) => state.project);
  const scenarioNames = info?.scenarios_list || [];

  return (
    <div>
      <div
        style={{
          padding: 24,
        }}
      >
        <h2>Scenarios in current Project</h2>
        <p>{scenarioNames.length} Scenario found</p>
        <List
          dataSource={scenarioNames}
          renderItem={(item) => (
            <List.Item>
              <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                {item}
              </div>
            </List.Item>
          )}
        />
      </div>
    </div>
  );
};

const CreateScenario = () => {
  const mapRef = useRef();
  const [viewState, setViewState] = useState();
  const [secondaryName, setSecondary] = useState('');
  const [geojson, setGeojson] = useState();
  const [location, setLocation] = useState();

  const onMapLoad = useCallback((e) => {
    const mapbox = e.target;

    // Store the map instance in the ref
    mapRef.current = mapbox;
  }, []);

  // Use mapbox to determine zoom level based on bbox
  useEffect(() => {
    if (location?.bbox && mapRef.current) {
      const mapbox = mapRef.current;
      const { zoom } = mapbox.cameraForBounds(location.bbox, {
        maxZoom: 18,
      });
      setViewState({
        ...viewState,
        zoom: zoom,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      // Trigger a refresh so that map is zoomed correctly
      mapbox.zoomTo(mapbox.getZoom());
    } else {
      setViewState(viewState);
    }
  }, [location]);

  const secondaryCards = {
    scenarioList: <ScenarioList />,
    map: (
      <EditableMap
        viewState={viewState}
        onViewStateChange={setViewState}
        polygon={geojson}
        onPolygonChange={setGeojson}
        onMapLoad={onMapLoad}
      />
    ),
  };

  return (
    <Row style={{ height: '100%' }}>
      <Col span={12}>{secondaryCards?.[secondaryName]}</Col>
      <Col span={12}>
        <MapFormContext.Provider value={{ geojson, setLocation }}>
          <CreateScenarioForm setSecondary={setSecondary} />
        </MapFormContext.Provider>
      </Col>
    </Row>
  );
};

export default CreateScenario;

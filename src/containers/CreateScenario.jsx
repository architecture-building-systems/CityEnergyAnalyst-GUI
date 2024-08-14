import { Col, Divider, List, Row, Steps } from 'antd';
import EditableMap from '../components/Map/EditableMap';
import { createContext, useEffect, useState } from 'react';
import NameForm from '../components/Project/CreateScenarioForms/NameForm';
import DatabaseForm, {
  useFetchDatabases,
} from '../components/Project/CreateScenarioForms/DatabaseForm';
import GeometryForm from '../components/Project/CreateScenarioForms/GeometryForm';
import TypologyForm from '../components/Project/CreateScenarioForms/TypologyForm';
import ContextForm, {
  useFetchWeather,
} from '../components/Project/CreateScenarioForms/ContextForm';
import { useSelector } from 'react-redux';

const CreateScenarioForm = ({ setVisible }) => {
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
      showMap: false,
      content: <NameForm initialValues={data} onFinish={onFinish} />,
    },
    {
      description: 'Database',
      showMap: false,
      content: (
        <DatabaseForm
          databases={databases}
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
        />
      ),
    },
    {
      description: 'Geometries',
      showMap: true,
      content: (
        <GeometryForm
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
        />
      ),
    },
    {
      description: 'Typology',
      showMap: true,
      content: (
        <TypologyForm
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
        />
      ),
    },
    {
      description: 'Context',
      showMap: true,
      content: (
        <ContextForm
          weather={weather}
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
        />
      ),
    },
  ];

  useEffect(() => {
    setVisible(forms[current].showMap);
  }, [current]);

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
        <p>Adds a new scenario to the current project.</p>
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
};

export const MapFormContext = createContext();

const CreateScenario = () => {
  const [geojson, setGeojson] = useState();
  const [location, setLocation] = useState();
  const [visible, setVisible] = useState(false);

  // TDOD: Get list of scenarios from project
  const { info } = useSelector((state) => state.project);
  const scenariosList = info?.scenarios_list || [];

  return (
    <Row style={{ height: '100%' }}>
      <Col span={12}>
        {(visible && (
          <EditableMap
            location={location}
            geojson={geojson}
            setValue={setGeojson}
          />
        )) || (
          <div
            style={{
              height: '100%',
              // backgroundColor: 'lightgrey',
              // opacity: 0.5,
              border: '1px solid #eee',
              borderRadius: 8,
            }}
          >
            <div style={{ padding: 24 }}>
              <h2>Scenarios in project</h2>
              <List
                dataSource={scenariosList}
                renderItem={(item) => (
                  <List.Item>
                    <div
                      style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                    >
                      {item}
                    </div>
                  </List.Item>
                )}
              />
            </div>
          </div>
        )}
      </Col>
      <Col span={12}>
        <MapFormContext.Provider value={{ geojson, setLocation, setVisible }}>
          <CreateScenarioForm setVisible={setVisible} />
        </MapFormContext.Provider>
      </Col>
    </Row>
  );
};

export default CreateScenario;

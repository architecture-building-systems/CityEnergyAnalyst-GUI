import { Col, Divider, Row, Steps } from 'antd';
import EditableMap from '../components/Map/EditableMap';
import { createContext, useState } from 'react';
import NameForm from '../components/Project/CreateScenarioForms/NameForm';
import DatabaseForm, {
  useFetchDatabases,
} from '../components/Project/CreateScenarioForms/DatabaseForm';
import GeometryForm from '../components/Project/CreateScenarioForms/GeometryForm';
import TypologyForm from '../components/Project/CreateScenarioForms/TypologyForm';
import ContextForm, {
  useFetchWeather,
} from '../components/Project/CreateScenarioForms/ContextForm';

const CreateScenarioForm = () => {
  const [current, setCurrent] = useState(0);
  const [data, setData] = useState({});
  const databases = useFetchDatabases();
  const weather = useFetchWeather();

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
    <NameForm initialValues={data} onFinish={onFinish} />,
    <DatabaseForm
      databases={databases}
      initialValues={data}
      onBack={onBack}
      onFinish={onFinish}
    />,
    <GeometryForm initialValues={data} onBack={onBack} onFinish={onFinish} />,
    <TypologyForm initialValues={data} onBack={onBack} onFinish={onFinish} />,
    <ContextForm
      weather={weather}
      initialValues={data}
      onBack={onBack}
      onFinish={onFinish}
    />,
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
        <p>Adds a new scenario to the current project.</p>
        <Divider />
      </div>
      <div style={{ flexGrow: 1 }}>{forms[current]}</div>
      <div style={{ marginTop: 24 }}>
        <Steps
          current={current}
          labelPlacement="vertical"
          items={[
            { description: 'Name' },
            { description: 'Database' },
            { description: 'Geometries' },
            { description: 'Typology' },
            { description: 'Context' },
          ]}
          size="small"
        />
      </div>
    </div>
  );
};

export const MapFormContext = createContext();

const CreateScenario = () => {
  // TODO: Use context instead of state
  const [geojson, setGeojson] = useState({});
  const [location, setLocation] = useState();

  return (
    <Row style={{ height: '100%' }}>
      <Col span={12}>
        <EditableMap location={location} setValue={setGeojson} />
      </Col>
      <Col span={12}>
        <MapFormContext.Provider value={{ geojson, setLocation }}>
          <CreateScenarioForm />
        </MapFormContext.Provider>
      </Col>
    </Row>
  );
};

export default CreateScenario;

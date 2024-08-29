import {
  Alert,
  Button,
  Col,
  List,
  Modal,
  Result,
  Row,
  Spin,
  Steps,
} from 'antd';
import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import NameForm from '../components/Project/CreateScenarioForms/NameForm';
import GeometryForm from '../components/Project/CreateScenarioForms/GeometryForm';
import ContextForm from '../components/Project/CreateScenarioForms/ContextForm';
import { useSelector } from 'react-redux';
import {
  MapFormContext,
  useFetchDatabases,
  useFetchWeather,
} from '../components/Project/CreateScenarioForms/hooks';
import axios from 'axios';
import { LoadingOutlined } from '@ant-design/icons';
import { useOpenScenario } from '../components/Project/Project';

const EditableMap = lazy(() => import('../components/Map/EditableMap'));

const useCreateScenario = (projectPath, { onSuccess }) => {
  const [formData, setFormData] = useState({});
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState();

  const createScenario = async (data) => {
    console.log(data);
    setError(null);
    setFetching(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_CEA_URL}/api/project/scenario/v2`,
        { ...data, project: projectPath },
      );
      onSuccess?.(response.data);
    } catch (error) {
      console.log(error);
      setError(error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (formData?.scenario_name && projectPath) {
      createScenario(formData);
    }
  }, [formData, projectPath]);

  return { setFormData, fetching, error };
};

const CreateScenarioProgressModal = ({
  showModal,
  setShowModal,
  success,
  error,
  fetching,
  onOk,
}) => {
  return (
    <Modal
      centered
      closable={false}
      footer={null}
      open={showModal}
      width="50vw"
    >
      <div>
        {fetching && (
          <Spin
            tip="Creating scenario..."
            indicator={<LoadingOutlined spin />}
            size="large"
          >
            <div style={{ height: 300 }} />
          </Spin>
        )}
        {error && (
          <Result
            status="error"
            title="Scenario creation failed"
            subTitle="There was an error while creating the scenario"
            extra={[
              <Button
                type="primary"
                key="console"
                onClick={() => setShowModal(false)}
              >
                Back
              </Button>,
            ]}
          />
        )}
        {success && (
          <Result
            status="success"
            title="Scenario created successfully!"
            subTitle={
              <>
                <div>Redirecting to Input Editor...</div>
                <div>Click below if you are not redirected.</div>
              </>
            }
            extra={[
              <Button key="ok" type="primary" onClick={onOk}>
                Go to Input Editor
              </Button>,
            ]}
          ></Result>
        )}
      </div>
    </Modal>
  );
};

const CreateScenarioForm = memo(function CreateScenarioForm({
  formIndex,
  onFormChange,
}) {
  const {
    info: { project },
  } = useSelector((state) => state.project);
  const openScenario = useOpenScenario();
  const { setFormData, fetching, error } = useCreateScenario(project, {
    // Redirect to input editor when scenario is created
    onSuccess: ({ scenario_name }) => {
      setSuccess(true);
      // Delay before redirecting to input editor
      setTimeout(() => openScenario(project, scenario_name), 2000);
    },
  });

  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState({});
  const databases = useFetchDatabases();
  const weather = useFetchWeather();

  const goToInputEditor = () => {
    openScenario(project, data.scenario_name);
  };

  const onChange = (values) => {
    setData((prev) => ({ ...prev, ...values }));
  };

  const onBack = () => {
    onFormChange((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const onFinish = (values) => {
    if (formIndex < forms.length - 1) {
      setData((prev) => ({ ...prev, ...values }));
      onFormChange((prev) => prev + 1);
    } else {
      setData((prev) => {
        const allFormData = { ...prev, ...values };
        setSuccess(false);
        setFormData(allFormData);
        return allFormData;
      });
      setShowModal(true);
    }
  };

  const FormButtons = () => {
    return (
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 24,
          flexDirection: 'row-reverse',
        }}
      >
        <Button type="primary" htmlType="submit" style={{ width: 100 }}>
          {formIndex === forms.length - 1 ? 'Finish' : 'Next'}
        </Button>
        {formIndex > 0 && (
          <Button style={{ width: 100 }} onClick={onBack}>
            Back
          </Button>
        )}
      </div>
    );
  };

  const forms = [
    {
      description: 'Name',
      content: (
        <NameForm
          initialValues={data}
          onFinish={onFinish}
          formButtons={<FormButtons />}
        />
      ),
    },
    {
      description: 'Buildings',
      content: (
        <GeometryForm
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
          formButtons={<FormButtons />}
        />
      ),
    },
    {
      description: 'Context',
      content: (
        <ContextForm
          databases={databases}
          weather={weather}
          initialValues={data}
          onChange={onChange}
          onBack={onBack}
          onFinish={onFinish}
          formButtons={<FormButtons />}
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
        <div style={{ marginTop: 48 }}>
          <Steps
            current={formIndex}
            labelPlacement="vertical"
            items={forms}
            size="small"
          />
        </div>
      </div>
      <div style={{ flexGrow: 1 }}>{forms[formIndex].content}</div>
      <CreateScenarioProgressModal
        showModal={showModal}
        setShowModal={setShowModal}
        success={success}
        error={error}
        fetching={fetching}
        onOk={goToInputEditor}
      />
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
  const [formIndex, setFormIndex] = useState(0);
  const handleFormIndexChange = useCallback((index) => setFormIndex(index), []);

  // Store map view state
  const [viewState, setViewState] = useState();
  const [geojson, setGeojson] = useState();
  const [drawingMode, setDrawingMode] = useState(false);

  const [buildings, setBuildings] = useState();

  const secondaryCards = {
    scenarioList: <ScenarioList />,
    map: (
      <Suspense fallback={<div>Loading Map...</div>}>
        <EditableMap
          viewState={viewState}
          onViewStateChange={setViewState}
          polygon={geojson}
          onPolygonChange={setGeojson}
          drawingMode={drawingMode}
          onFetchedBuildings={setBuildings}
          buildings={buildings}
        />
      </Suspense>
    ),
  };

  const contextValue = useMemo(
    () => ({ geojson, setDrawingMode, setBuildings }),
    [geojson],
  );

  return (
    <Alert.ErrorBoundary>
      <Row style={{ height: '100%' }}>
        <Col span={12}>
          {formIndex == 0 ? secondaryCards.scenarioList : secondaryCards.map}
        </Col>
        <Col span={12}>
          <MapFormContext.Provider value={contextValue}>
            <CreateScenarioForm
              formIndex={formIndex}
              onFormChange={handleFormIndexChange}
            />
          </MapFormContext.Provider>
        </Col>
      </Row>
    </Alert.ErrorBoundary>
  );
};

export default CreateScenario;

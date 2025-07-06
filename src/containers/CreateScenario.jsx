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
  useRef,
  useState,
} from 'react';
import NameForm from '../components/Project/CreateScenarioForms/NameForm';
import GeometryForm from '../components/Project/CreateScenarioForms/GeometryForm';
import ContextForm from '../components/Project/CreateScenarioForms/ContextForm';
import {
  MapFormContext,
  useFetchDatabases,
  useFetchWeather,
} from '../components/Project/CreateScenarioForms/hooks';
import { LoadingOutlined } from '@ant-design/icons';
import { useCameraForBounds } from '../components/Map/hooks';
import { calcBoundsAndCenter } from '../components/Map/utils';

import routes from '../constants/routes.json';
import { useProjectStore } from '../stores/projectStore';
import { useOpenScenario } from '../components/Project/hooks';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { apiClient } from '../api/axios';

const EditableMap = lazy(() => import('../components/Map/EditableMap'));

const useCreateScenario = (projectPath, { onSuccess }) => {
  const [formData, setFormData] = useState({});
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState();

  const createScenario = async (data) => {
    setError(null);
    setFetching(true);

    try {
      const formattedData = {};

      Object.keys(data).forEach((key) => {
        // Convert objects to strings
        if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
          formattedData[key] = JSON.stringify(data[key]);
        } else {
          formattedData[key] = data[key];
        }
      });
      formattedData['project'] = projectPath;

      const response = await apiClient.postForm(
        `/api/project/scenario/v2`,
        formattedData,
      );
      onSuccess?.(response.data);
    } catch (error) {
      console.log(error?.response?.data || error);
      setError(error?.response?.data || error);
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
        <ErrorBoundary>
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
              status="warning"
              title="Scenario creation failed"
              subTitle={
                error?.detail
                  ? JSON.stringify(error.detail)
                  : 'There was an error while creating the scenario'
              }
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
                  <div>Redirecting to Scenario...</div>
                  <div>Click below if you are not redirected.</div>
                </>
              }
              extra={[
                <Button key="ok" type="primary" onClick={onOk}>
                  Open Scenario
                </Button>,
              ]}
            ></Result>
          )}
        </ErrorBoundary>
      </div>
    </Modal>
  );
};

const CreateScenarioForm = memo(function CreateScenarioForm({
  formIndex,
  onFormChange,
}) {
  const project = useProjectStore((state) => state.project);
  const openScenario = useOpenScenario(routes.PROJECT);
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

  const goToScenario = () => {
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
        onOk={goToScenario}
      />
    </div>
  );
});

const ScenarioList = () => {
  const project = useProjectStore((state) => state.project);
  const scenariosList = useProjectStore((state) => state.scenariosList);
  const fetchInfo = useProjectStore((state) => state.fetchInfo);

  const { isFetching, error } = useProjectStore();

  const scenarioNames = useMemo(
    () => scenariosList?.sort() ?? [],
    [scenariosList],
  );

  // Ensure scenariosList is udpated
  useEffect(() => {
    project && fetchInfo(project);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',

        padding: 24,
      }}
    >
      <div>
        <h2>Scenarios in current Project</h2>
        <p>{scenarioNames.length} Scenario found</p>
      </div>
      <div style={{ overflow: 'auto' }}>
        {error ? (
          <div>Error fetching scenarios</div>
        ) : isFetching ? (
          <div>Fetching scenarios...</div>
        ) : (
          <List
            dataSource={scenarioNames}
            renderItem={(item) => (
              <List.Item
                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
              >
                {item}
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};

const CreateScenario = () => {
  const mapRef = useRef();
  const onMapLoad = useCallback((e) => (mapRef.current = e.target), []);

  const [formIndex, setFormIndex] = useState(0);
  const handleFormIndexChange = useCallback((index) => setFormIndex(index), []);

  // Store map state
  const [controller, setController] = useState(true);
  const [viewState, setViewState] = useState();
  const [drawingMode, setDrawingMode] = useState(false);
  const [polygon, setPolygon] = useState();
  const [fetchedBuildings, setFetchedBuildings] = useState();

  const [buildings, setBuildings] = useState();

  const { setLocation } = useCameraForBounds(
    mapRef,
    ({ cameraOptions, location }) => {
      mapRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: cameraOptions.zoom,
        speed: 8,
      });
    },
  );

  const handleZoneGeometryChange = useCallback((zone) => {
    setBuildings(zone);
    setLocation(calcBoundsAndCenter(zone));
  }, []);

  const initialValues = useMemo(
    () => ({
      polygon,
      fetchedBuildings,
    }),
    [fetchedBuildings, polygon],
  );

  const secondaryCards = {
    scenarioList: (
      <div style={{ height: 'calc(100vh - 200px)' }}>
        <ScenarioList />
      </div>
    ),
    map: (
      <Suspense fallback={<div>Loading Map...</div>}>
        <EditableMap
          initialValues={initialValues}
          controller={controller}
          viewState={viewState}
          onViewStateChange={setViewState}
          onPolygonChange={setPolygon}
          drawingMode={drawingMode}
          onFetchedBuildings={setFetchedBuildings}
          buildings={buildings}
          onMapLoad={onMapLoad}
        />
      </Suspense>
    ),
  };

  useEffect(() => {
    if (formIndex === 2) {
      // Disable map controller
      setController(false);
      // Go to building location on last form
      setLocation(calcBoundsAndCenter(buildings));
    } else {
      // Enable map controller
      setController(true);
    }
  }, [buildings, formIndex, setLocation]);

  const contextValue = useMemo(
    () => ({
      polygon,
      fetchedBuildings,
      setPolygon,
      setDrawingMode,
      setBuildings: handleZoneGeometryChange,
    }),
    [polygon, fetchedBuildings, handleZoneGeometryChange],
  );

  return (
    <Alert.ErrorBoundary>
      <Row style={{ height: '100%' }}>
        <Col span={12}>
          <div
            style={{
              height: '100%',
              overflow: 'auto',
              background: '#fff',
              borderRadius: 8,
              border: '1px solid #eee',
            }}
          >
            {formIndex == 0 ? secondaryCards.scenarioList : secondaryCards.map}
          </div>
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

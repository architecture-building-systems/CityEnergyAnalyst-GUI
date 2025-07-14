import { Alert, Col, Row } from 'antd';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MapFormContext } from 'features/scenario/hooks/create-scenario-forms';
import { useCameraForBounds } from 'features/map/hooks';
import { calcBoundsAndCenter } from 'features/map/utils';

import { CreateScenarioForm } from 'features/scenario/components/create-scenario-form';
import { ScenarioList } from 'features/scenario/components/scenario-list';

const EditableMap = lazy(
  () => import('features/map/components/Map/EditableMap'),
);

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

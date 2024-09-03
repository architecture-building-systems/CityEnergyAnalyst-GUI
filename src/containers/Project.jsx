import { useDispatch, useSelector } from 'react-redux';
import DeckGLMap from '../components/Map/Map';
import OverviewCard from '../components/Project/Cards/OverviewCard/OverviewCard';
import { useEffect, useState } from 'react';
import { fetchInputData, resetInputData } from '../actions/inputEditor';
import { Spin, Tabs } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import Table from '../components/InputEditor/Table';
import Toolbar from '../components/Project/Cards/Toolbar/Toolbar';
import ToolCard from '../components/Project/Cards/ToolCard/ToolCard';

const Project = () => {
  const dispatch = useDispatch();

  const {
    project,
    project_name: projectName,
    scenario_name: scenarioName,
    scenarios_list: scenarioList,
  } = useSelector((state) => state.project.info);

  const [selectedTool, setSelectedTool] = useState(null);

  useEffect(() => setSelectedTool(null), [projectName, scenarioName]);

  useEffect(() => {
    if (scenarioName !== null) dispatch(fetchInputData());
    // Reset input data state on umount
    return () => {
      dispatch(resetInputData());
    };
  }, [dispatch, projectName, scenarioName]);

  return (
    <div style={{ height: '100%', background: '#f0f2f8' }}>
      <div
        style={{
          position: 'absolute',
          margin: 12,
          zIndex: 1,

          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',

          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            // TODO: Make this dynamic
            height: '33vh',
            width: 250,

            pointerEvents: 'auto',
          }}
        >
          <OverviewCard
            project={project}
            projectName={projectName}
            scenarioName={scenarioName}
            scenarioList={scenarioList}
          />
        </div>

        <div
          style={{
            height: '100%',
            pointerEvents: 'auto',
          }}
        >
          <Toolbar onToolSelected={setSelectedTool} />
        </div>
      </div>

      <InputMap projectName={projectName} scenarioName={scenarioName} />
      <div
        style={{
          position: 'absolute',
          zIndex: 1,
          bottom: 24,
          margin: 12,

          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          justifyContent: 'flex-end',

          height: 'calc(100% - 48px)',
          width: 'calc(100% - 24px)',

          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            borderRadius: 12,
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

            // TODO: Make this dynamic
            maxHeight: '30%',
            overflow: 'auto',
            pointerEvents: 'auto',

            flexGrow: 1,
          }}
        >
          <InputTable />
        </div>
        {selectedTool && (
          <div style={{ height: '100%', pointerEvents: 'auto' }}>
            <ToolCard
              selectedTool={selectedTool}
              onClose={() => setSelectedTool(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const InputMap = () => {
  const { status } = useSelector((state) => state.inputData);
  const { geojsons, colors } = useSelector((state) => state.inputData);

  return (
    <>
      <div
        style={{
          height: '100%',
          position: 'relative',
          background: 'rgba(0, 0, 0, 0.05)',
        }}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      >
        {status == 'fetching' && (
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 50 }} spin />}
            tip="Loading Inputs"
            size="large"
            percent="auto"
            fullscreen
          />
        )}
        <DeckGLMap data={geojsons} colors={colors} />
      </div>
    </>
  );
};

const InputTable = () => {
  const tables = useSelector((state) => state.inputData.tables);
  const [tab, setTab] = useState('zone');

  if (typeof tables == 'undefined') return null;

  return (
    <div
      className="cea-input-editor"
      style={{ height: '100%', padding: '0 12px', background: '#fff' }}
    >
      <Tabs
        className="cea-input-editor-tabs"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: '#fff',
          paddingTop: 12,
        }}
        size="small"
        type="card"
        activeKey={tab}
        onChange={setTab}
        animated={false}
        items={[...Object.keys(tables), 'schedules'].map((key) => ({
          key: key,
          label: key,
        }))}
      />
      <div
        className="cea-input-editor-table"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '0 12px',
          background: '#fff',
          paddingBottom: 12,
        }}
      >
        <Table tab={tab} />
      </div>
    </div>
  );
};

export default Project;

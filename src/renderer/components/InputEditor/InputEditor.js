import React, { useEffect, useState } from 'react';
import DeckGLMap from '../Map/Map';
import Table from './Table';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInputData, resetInputData } from '../../actions/inputEditor';
import { Tabs, Modal, Icon } from 'antd';
import CenterSpinner from '../HomePage/CenterSpinner';
import NavigationPrompt from './NavigationPrompt';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import './InputEditor.css';

const MAP_STYLE = {
  height: '500px',
  width: '100%',
  position: 'relative',
  background: 'rgba(0, 0, 0, 0.05)'
};

const InputEditor = () => {
  const { status, error } = useSelector(state => state.inputData);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchInputData());
    // Reset input data state on umount
    return () => {
      dispatch(resetInputData());
    };
  }, []);

  if (error) return <div>Error encountered</div>;
  if (status == 'fetching')
    return (
      <CenterSpinner
        indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
        tip="Reading Input Files..."
      />
    );

  return (
    <div>
      <InputMap />
      <InputTable />
      <InputNavigationPrompt />
    </div>
  );
};

const InputMap = () => {
  const { geojsons, colors } = useSelector(state => state.inputData);

  if (!geojsons) return null;
  return (
    <div style={MAP_STYLE}>
      {geojsons ? <DeckGLMap data={geojsons} colors={colors} /> : null}
    </div>
  );
};

const InputTable = () => {
  const { order } = useSelector(state => state.inputData);
  const [tab, setTab] = useState('zone');

  if (!order) return null;
  const TabPanes = order.map(key => <Tabs.TabPane key={key} tab={key} />);
  return (
    <div className="cea-input-editor" style={{ margin: '10px 0' }}>
      <Tabs
        className="cea-input-editor-tabs"
        size="small"
        activeKey={tab}
        onChange={setTab}
      >
        {TabPanes}
      </Tabs>
      <div className="cea-input-editor-table">
        <Table tab={tab} />
      </div>
    </div>
  );
};

const InputNavigationPrompt = () => {
  const { changes } = useSelector(state => state.inputData);

  return (
    <NavigationPrompt
      when={
        Object.keys(changes.update).length || Object.keys(changes.delete).length
      }
    >
      {(isOpen, onConfirm, onCancel) => (
        <Modal
          centered
          closable={false}
          visible={isOpen}
          onOk={onConfirm}
          onCancel={onCancel}
        >
          There are still unsaved changes.
          <br />
          <i>(Any unsaved changes will be discarded)</i>
          <br />
          <br />
          Are you sure you want to navigate away?
        </Modal>
      )}
    </NavigationPrompt>
  );
};

export default withErrorBoundary(InputEditor);

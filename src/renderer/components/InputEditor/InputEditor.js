import React, { useEffect, useState } from 'react';
import Map from '../Map/Map';
import Table from './Table';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInputData } from '../../actions/inputEditor';
import { Tabs } from 'antd';

const MAP_STYLE = {
  height: '500px',
  width: '100%',
  position: 'relative',
  background: 'rgba(0, 0, 0, 0.05)'
};

const InputEditor = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchInputData());
  }, []);

  return (
    <div>
      <InputMap />
      <br />
      <InputTable />
    </div>
  );
};

const InputMap = () => {
  const { geojsons, isFetchingInputData } = useSelector(
    state => state.inputData
  );

  return <Map style={MAP_STYLE} data={isFetchingInputData ? null : geojsons} />;
};

const InputTable = () => {
  const { order, isFetchingInputData } = useSelector(state => state.inputData);
  const [tab, setTab] = useState('zone');

  const { TabPane } = Tabs;
  if (isFetchingInputData || !order) return null;
  const TabPanes = order.map(key => {
    return <TabPane key={key} tab={key} />;
  });
  return (
    <div>
      <Tabs defaultActiveKey={tab} onChange={setTab}>
        {TabPanes}
      </Tabs>
      <Table tab={tab} />
    </div>
  );
};

export default InputEditor;

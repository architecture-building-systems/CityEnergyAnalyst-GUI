import React, { useEffect, useState } from 'react';
import Map from '../Map/Map';
import Table from './Table';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInputData, resetInputData } from '../../actions/inputEditor';
import { Tabs, Icon } from 'antd';
import CenterSpinner from '../HomePage/CenterSpinner';

const MAP_STYLE = {
  height: '500px',
  width: '100%',
  position: 'relative',
  background: 'rgba(0, 0, 0, 0.05)'
};

const InputEditor = () => {
  const [loaded, setLoaded] = useState(false);

  const onLoad = () => {
    setLoaded(true);
  };

  return (
    <React.Fragment>
      {loaded ? null : (
        <CenterSpinner
          indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
          tip="Reading input files"
        />
      )}
      <iframe
        style={{ display: loaded ? 'block' : 'none' }}
        src="http://localhost:5050/inputs/building-properties?div=true"
        height={980}
        width="100%"
        scrolling="no"
        frameBorder="false"
        onLoad={onLoad}
      />
    </React.Fragment>
  );
};

const InputEditorReact = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchInputData());
    return () => {
      dispatch(resetInputData());
    };
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
  const { geojsons, colors, isFetchingInputData, error } = useSelector(
    state => state.inputData
  );

  if (error) return <div>{error}</div>;
  return (
    <Map
      style={MAP_STYLE}
      data={geojsons}
      colors={colors}
      loading={isFetchingInputData}
    />
  );
};

const InputTable = () => {
  const { order } = useSelector(state => state.inputData);
  const [tab, setTab] = useState('zone');

  if (!order) return null;
  const TabPanes = order.map(key => <Tabs.TabPane key={key} tab={key} />);
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

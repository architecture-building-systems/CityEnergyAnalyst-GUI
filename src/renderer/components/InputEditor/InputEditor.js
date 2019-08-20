import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Map from '../Map/Map';
import { fetchInputData } from '../../actions/inputEditor';

const MAP_STYLE = { height: '500px', width: '100%', position: 'relative' };

const InputEditor = () => {
  const dispatch = useDispatch();
  const { isFetching, data } = useSelector(state => state.inputData);
  const geojsons = isFetching ? null : data ? data.geojsons : null;

  useEffect(() => {
    dispatch(fetchInputData());
  }, []);
  return <Map style={MAP_STYLE} data={geojsons} />;
};

export default InputEditor;

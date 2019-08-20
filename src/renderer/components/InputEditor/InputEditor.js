import React, { useEffect, useState } from 'react';
import Map, { useGeoJsons } from '../Map/Map';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInputData } from '../../actions/inputEditor';
import axios from 'axios';

const MAP_STYLE = { height: '500px', width: '100%', position: 'relative' };

const InputEditor = () => {
  // const dispatch = useDispatch();
  // const { isFetching, data } = useSelector(state => state.inputData);
  // const geojsons = isFetching ? null : data ? data.geojsons : null;

  // useEffect(() => {
  //   dispatch(fetchInputData());
  // }, []);
  const [geojsons, setGeoJsons] = useGeoJsons(['zone', 'district', 'streets']);
  const [data, setData] = useState();

  useEffect(() => {
    axios
      .get('http://localhost:5050/api/inputs/building-properties')
      .then(response => {
        return setData(response.data);
      })
      .catch(error => {
        return console.log(error.response.data);
      });
  }, []);

  return (
    <div>
      <Map style={MAP_STYLE} data={geojsons} />
      <InputTable setData={setData} />
    </div>
  );
};

const InputTable = () => {
  return <div>Test</div>;
};

export default InputEditor;

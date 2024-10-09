import axios from 'axios';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const fetchMapLayer = async (category, layer_name, params) => {
  try {
    const resp = await axios.post(
      `${import.meta.env.VITE_CEA_URL}/api/map_layers/${category}/${layer_name}/generate`,
      params,
    );
    return resp.data;
  } catch (err) {
    console.error(err.response.data);
  }
};

export const useGetMapLayer = (category, layers) => {
  const [mapLayers, setMapLayers] = useState({});
  const { project, scenario_name: scenarioName } = useSelector(
    (state) => state.project.info,
  );

  // FIXME: This is hardcoded for now
  const parameters = {
    'scenario-name': scenarioName,
    buildings: null,
    hour: 12,
  };

  const generateLayers = async () => {
    let out = {};
    for (const layer of layers) {
      const data = await fetchMapLayer(category, layer.name, {
        project,
        parameters,
      });
      out[layer.name] = data;
    }
    setMapLayers(out);
  };

  useEffect(() => {
    if (!layers) setMapLayers({});
    else generateLayers();
  }, [category, layers, scenarioName]);

  return mapLayers;
};

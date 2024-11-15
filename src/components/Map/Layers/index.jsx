import axios from 'axios';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMapStore } from '../store/store';
import {
  LEGEND_COLOUR_ARRAY,
  LEGEND_POINTS,
  SOLAR_IRRADIANCE,
} from './constants';

export const useGetMapLayerCategories = () => {
  const [mapLayers, setMapLayers] = useState({});

  const fetchMapLayerCategories = async () => {
    try {
      const resp = await axios.get(
        `${import.meta.env.VITE_CEA_URL}/api/map_layers/`,
      );
      setMapLayers(resp.data);
    } catch (err) {
      console.error(err.response.data);
    }
  };

  useEffect(() => {
    fetchMapLayerCategories();
  }, []);

  return mapLayers;
};

export const useGetMapLayers = (categoryInfo, parameters) => {
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(false);

  const setMapLayers = useMapStore((state) => state.setMapLayers);

  const project = useSelector((state) => state.project.info.project);
  const scenarioName = useSelector((state) => state.project.info.scenario_name);

  useEffect(() => {
    if (categoryInfo && parameters) {
      console.log('fetching map layers', categoryInfo, parameters);
      const { name, layers } = categoryInfo;

      const generateLayers = async () => {
        let out = {};

        try {
          setFetching(true);
          setError(null);
          for (const layer of layers) {
            const data = await fetchMapLayer(name, layer.name, {
              project,
              parameters: {
                'scenario-name': scenarioName,
                ...parameters,
              },
            });
            out[layer.name] = data;
          }
          setMapLayers(out);
        } catch (error) {
          console.error(error.response.data);
          setError(error.response.data?.detail || 'Unknown error');
        } finally {
          setFetching(false);
        }
      };

      generateLayers();
    }
  }, [categoryInfo, parameters, project, scenarioName]);

  return { fetching, error };
};

export const useMapLegends = () => {
  const mapLayers = useMapStore((state) => state.mapLayers);
  const mapLegends = useMapStore((state) => state.mapLayerLegends);
  const setMapLayerLegends = useMapStore((state) => state.setMapLayerLegends);

  const project = useSelector((state) => state.project.info.project);
  const scenarioName = useSelector((state) => state.project.info.scenario_name);

  useEffect(() => {
    if (mapLayers?.[SOLAR_IRRADIANCE]) {
      const props = mapLayers[SOLAR_IRRADIANCE].properties;
      const label = props['label'];
      const _range = props['range'];
      setMapLayerLegends({
        [SOLAR_IRRADIANCE]: {
          colourArray: LEGEND_COLOUR_ARRAY,
          LEGEND_POINTS,
          range: _range,
          label,
        },
      });
    } else setMapLayerLegends({});
  }, [mapLayers, setMapLayerLegends, project, scenarioName]);

  return mapLegends;
};

const fetchMapLayer = async (category, layer_name, params) => {
  const resp = await axios.post(
    `${import.meta.env.VITE_CEA_URL}/api/map_layers/${category}/${layer_name}/generate`,
    params,
  );
  return resp.data;
};

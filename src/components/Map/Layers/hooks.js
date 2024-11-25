import axios from 'axios';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMapStore } from '../store/store';
import {
  DEMAND,
  LEGEND_COLOUR_ARRAY,
  LEGEND_POINTS,
  SOLAR_IRRADIATION,
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

const hasAllParameters = (categoryInfo, parameters) => {
  // Verify all required parameters exist
  const hasAllParameters = categoryInfo.layers.every((layer) => {
    return Object.entries(layer.parameters).every(([key, param]) => {
      // Ignore scenario-name
      return key == 'scenario-name' || parameters?.[key] !== undefined;
    });
  });

  if (!hasAllParameters) {
    console.log('missing parameters', parameters, categoryInfo);
  }

  return hasAllParameters;
};

export const useGetMapLayers = (
  categoryInfo,
  project,
  scenarioName,
  parameters,
) => {
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(false);

  const setMapLayers = useMapStore((state) => state.setMapLayers);

  useEffect(() => {
    // Only fetch if we have both category and valid parameters
    if (
      !categoryInfo?.layers ||
      !parameters ||
      !hasAllParameters(categoryInfo, parameters)
    )
      return;

    const { name, layers } = categoryInfo;

    let ignore = false;

    const generateLayers = async () => {
      const out = {};
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
        if (!ignore) {
          setMapLayers(out);
        }
      } catch (error) {
        console.error(error.response?.data);
        setError(error.response?.data?.detail || 'Unknown error');
        setMapLayers(null);
      } finally {
        setFetching(false);
      }
    };

    generateLayers();

    return () => {
      ignore = true;
    };
  }, [parameters]);

  return { fetching, error };
};

export const useMapLegends = () => {
  const mapLayers = useMapStore((state) => state.mapLayers);
  const mapLegends = useMapStore((state) => state.mapLayerLegends);
  const setMapLayerLegends = useMapStore((state) => state.setMapLayerLegends);

  const project = useSelector((state) => state.project.info.project);
  const scenarioName = useSelector((state) => state.project.info.scenario_name);

  useEffect(() => {
    if (mapLayers?.[SOLAR_IRRADIATION]) {
      const props = mapLayers[SOLAR_IRRADIATION].properties;
      const label = props['label'];
      const _range = props['range'];
      setMapLayerLegends({
        [SOLAR_IRRADIATION]: {
          colourArray: LEGEND_COLOUR_ARRAY,
          LEGEND_POINTS,
          range: _range,
          label,
        },
      });
    } else if (mapLayers?.[DEMAND]) {
      const props = mapLayers[DEMAND].properties;
      const label = props['label'];
      const _range = props['range'];
      setMapLayerLegends({
        [DEMAND]: {
          colourArray: LEGEND_COLOUR_ARRAY,
          LEGEND_POINTS,
          range: _range,
          label,
        },
      });
    } else setMapLayerLegends(null);
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

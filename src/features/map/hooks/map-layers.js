import { useEffect, useState } from 'react';
import { useMapStore } from 'features/map/stores/mapStore';
import {
  DEMAND,
  SOLAR_IRRADIATION,
  RENEWABLE_ENERGY_POTENTIALS,
  LIFE_CYCLE_ANALYSIS,
} from 'features/map/constants';
import { useProjectStore } from 'features/project/stores/projectStore';
import { apiClient } from 'lib/api/axios';

export const useGetMapLayerCategories = () => {
  const [mapLayers, setMapLayers] = useState({});

  const fetchMapLayerCategories = async () => {
    try {
      const resp = await apiClient.get(`/api/map_layers/`);
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
      return (
        key == 'scenario-name' ||
        param?.filter ||
        parameters?.[key] !== undefined
      );
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

  // Reset error when category changes
  useEffect(() => {
    setError(null);
  }, [categoryInfo, parameters]);

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
            scenario_name: scenarioName,
            parameters,
          });
          out[layer.name] = data;
        }
        if (!ignore) {
          setMapLayers(out);
        }
      } catch (error) {
        console.error(error.response?.data);
        console.log(parameters);
        setError(error.response?.data?.detail || 'Unknown error');
        setMapLayers(null);
      } finally {
        setFetching(false);
      }
    };

    setFetching(true);
    const handler = setTimeout(() => {
      generateLayers();
    }, 300);

    return () => {
      clearTimeout(handler); // Clear timeout if value changes before the delay ends
      ignore = true;
    };
  }, [parameters]);

  return { fetching, error };
};

export const useMapLegends = () => {
  const mapLayers = useMapStore((state) => state.mapLayers);
  const mapLegends = useMapStore((state) => state.mapLayerLegends);
  const setMapLayerLegends = useMapStore((state) => state.setMapLayerLegends);

  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);

  useEffect(() => {
    if (mapLayers?.[SOLAR_IRRADIATION]) {
      const props = mapLayers[SOLAR_IRRADIATION].properties;
      const label = props['label'];
      const _range = props['range'];
      const colours = props['colours'];
      setMapLayerLegends({
        [SOLAR_IRRADIATION]: {
          colourArray: colours?.colour_array,
          points: colours?.points,
          range: _range,
          label,
        },
      });
    } else if (mapLayers?.[DEMAND]) {
      const props = mapLayers[DEMAND].properties;
      const label = props['label'];
      const _range = props['range'];
      const colours = props['colours'];
      setMapLayerLegends({
        [DEMAND]: {
          colourArray: colours?.colour_array,
          points: colours?.points,
          range: _range,
          label,
        },
      });
    } else if (mapLayers?.[RENEWABLE_ENERGY_POTENTIALS]) {
      const props = mapLayers[RENEWABLE_ENERGY_POTENTIALS].properties;
      const label = props['label'];
      const _range = props['range'];
      const colours = props['colours'];
      setMapLayerLegends({
        [RENEWABLE_ENERGY_POTENTIALS]: {
          colourArray: colours?.colour_array,
          points: colours?.points,
          range: _range,
          label,
        },
      });
    } else if (mapLayers?.[LIFE_CYCLE_ANALYSIS]) {
      const props = mapLayers[LIFE_CYCLE_ANALYSIS].properties;
      const label = props['label'];
      const _range = props['range'];
      const colours = props['colours'];
      setMapLayerLegends({
        [LIFE_CYCLE_ANALYSIS]: {
          colourArray: colours?.colour_array,
          points: colours?.points,
          range: _range,
          label,
        },
      });
    } else setMapLayerLegends(null);
  }, [mapLayers, setMapLayerLegends, project, scenarioName]);

  return mapLegends;
};

const fetchMapLayer = async (category, layer_name, params) => {
  const resp = await apiClient.post(
    `/api/map_layers/${category}/${layer_name}/generate`,
    params,
  );
  return resp.data;
};

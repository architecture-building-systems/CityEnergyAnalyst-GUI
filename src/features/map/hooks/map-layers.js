import { useEffect, useMemo, useState } from 'react';
import { useMapStore, useSelectedMapLayer } from 'features/map/stores/mapStore';
import {
  DEMAND,
  SOLAR_IRRADIATION,
  RENEWABLE_ENERGY_POTENTIALS,
  EMISSIONS_EMBODIED,
  EMISSIONS_OPERATIONAL,
} from 'features/map/constants';
import { useProjectStore } from 'features/project/stores/projectStore';
import { apiClient } from 'lib/api/axios';

const hasAllParameters = (layer, parameters) => {
  if (!layer || !layer.parameters) return false;
  if (!parameters || !Object.keys(parameters).length) return false;

  // Verify all required parameters exist
  const hasAllParameters = Object.entries(layer.parameters).every(
    ([key, param]) => {
      // Ignore scenario-name
      return (
        key == 'scenario-name' ||
        param?.filter ||
        parameters?.[key] !== undefined
      );
    },
  );

  if (!hasAllParameters) {
    console.log('missing parameters', parameters);
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
  const selectedMapLayer = useSelectedMapLayer();

  const { name: categoryName, layers } = categoryInfo || {};
  const selectedLayerInfo = useMemo(
    () => layers?.find((l) => l.name === selectedMapLayer),
    [layers, selectedMapLayer],
  );

  // Reset error when category changes
  useEffect(() => {
    setError(null);
  }, [categoryName, parameters]);

  useEffect(() => {
    // Only fetch if we have both category and valid parameters
    if (
      !selectedLayerInfo ||
      !hasAllParameters(selectedLayerInfo, parameters)
    ) {
      setMapLayers(null);
      return;
    }

    let ignore = false;

    const generateLayers = async () => {
      const out = {};
      try {
        setFetching(true);
        setError(null);
        const data = await fetchMapLayer(categoryName, selectedLayerInfo.name, {
          project,
          scenario_name: scenarioName,
          parameters,
        });
        out[selectedLayerInfo.name] = data;

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
  }, [categoryName, parameters, selectedLayerInfo]);

  return { fetching, error };
};

export const useMapLegends = () => {
  const mapLayers = useMapStore((state) => state.mapLayers);
  const mapLegends = useMapStore((state) => state.mapLayerLegends);
  const setMapLayerLegends = useMapStore((state) => state.setMapLayerLegends);

  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const selectedMapLayer = useSelectedMapLayer();

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
    } else if (
      mapLayers?.[EMISSIONS_EMBODIED] ||
      mapLayers?.[EMISSIONS_OPERATIONAL]
    ) {
      const props = mapLayers[selectedMapLayer].properties;
      const label = props['label'];
      const _range = props['range'];
      const colours = props['colours'];
      setMapLayerLegends({
        [selectedMapLayer]: {
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

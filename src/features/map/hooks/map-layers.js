import { useEffect, useMemo, useState } from 'react';
import {
  useScopedMapLayers,
  useScopedMapLayerLegends,
  useScopedSelectedMapLayer,
  useScopedSetMapLayerLegends,
  useScopedSetMapLayers,
  useScopedSetRange,
} from 'features/canvas/components/mapInstance';
import {
  DEMAND,
  SOLAR_IRRADIATION,
  RENEWABLE_ENERGY_POTENTIALS,
  EMISSIONS_EMBODIED,
  EMISSIONS_OPERATIONAL,
  ANTHROPOGENIC_HEAT,
  FINAL_ENERGY,
} from 'features/map/constants';
import { useProjectStore } from 'features/project/stores/projectStore';
import { apiClient } from 'lib/api/axios';
import { scenarioHeaders } from 'lib/api/scenarioContext';

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
  childScenario = null,
) => {
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(false);

  const setMapLayers = useScopedSetMapLayers();
  const setRange = useScopedSetRange();
  const selectedMapLayer = useScopedSelectedMapLayer();

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
      // Reset fetching too — otherwise the loading overlay stays stuck
      // when `parameters` momentarily becomes incomplete (e.g. while a
      // Canvas BottomCard switches its provider to a new card).
      setFetching(false);
      return;
    }

    let ignore = false;

    const generateLayers = async () => {
      const out = {};
      try {
        setFetching(true);
        setError(null);
        const data = await fetchMapLayer(
          categoryName,
          selectedLayerInfo.name,
          { parameters },
          scenarioHeaders({ project, scenarioName, childScenario }),
        );
        out[selectedLayerInfo.name] = data;

        if (!ignore) {
          setMapLayers(out);
          // `range` was historically set by `Legend`'s effect, but
          // Canvas Builder hides the Legend — set it here so the colour
          // gradient + elevation domain work whether or not the Legend
          // renders. Same first-key heuristic Legend uses.
          const rangeMap = data?.properties?.range;
          const firstKey = rangeMap && Object.keys(rangeMap)[0];
          const entry = firstKey ? rangeMap[firstKey] : null;
          if (entry?.min != null && entry?.max != null) {
            setRange([entry.min, entry.max]);
          }
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
  }, [categoryName, parameters, selectedLayerInfo, childScenario]);

  return { fetching, error };
};

export const useMapLegends = () => {
  const mapLayers = useScopedMapLayers();
  const mapLegends = useScopedMapLayerLegends();
  const setMapLayerLegends = useScopedSetMapLayerLegends();

  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const selectedMapLayer = useScopedSelectedMapLayer();

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
    } else if (
      mapLayers?.[EMISSIONS_EMBODIED] ||
      mapLayers?.[EMISSIONS_OPERATIONAL] ||
      mapLayers?.[ANTHROPOGENIC_HEAT] ||
      mapLayers?.[FINAL_ENERGY] ||
      mapLayers?.[DEMAND] ||
      mapLayers?.[RENEWABLE_ENERGY_POTENTIALS]
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
          stacked: props['stacked'] === true,
          categories: props['categories'],
          info: props['info'],
        },
      });
    } else setMapLayerLegends(null);
  }, [mapLayers, setMapLayerLegends, project, scenarioName]);

  return mapLegends;
};

const fetchMapLayer = async (category, layer_name, body, headers = {}) => {
  const resp = await apiClient.post(
    `/api/map_layers/${category}/${layer_name}/generate`,
    body,
    { headers },
  );
  return resp.data;
};

import axios from 'axios';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMapStore } from '../store/store';

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
      // setError(err.response.data);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapLayerCategories();
  }, []);

  return mapLayers;
};

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

export const useGetMapLayers = () => {
  const mapCategoryInfo = useMapStore((state) => state.selectedMapCategory);
  const mapLayers = useMapStore((state) => state.mapLayers);
  const setMapLayers = useMapStore((state) => state.setMapLayers);

  const project = useSelector((state) => state.project.info.project);
  const scenarioName = useSelector((state) => state.project.info.scenario_name);

  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);

  useEffect(() => {
    if (mapCategoryInfo?.layers && mapLayerParameters) {
      const generateLayers = async () => {
        let out = {};

        const { name, layers } = mapCategoryInfo;
        for (const layer of layers) {
          const data = await fetchMapLayer(name, layer.name, {
            project,
            parameters: {
              'scenario-name': scenarioName,
              ...mapLayerParameters,
            },
          });
          out[layer.name] = data;
        }
        setMapLayers(out);
      };

      generateLayers();
    } else setMapLayers({});
  }, [
    mapCategoryInfo,
    mapLayerParameters,
    project,
    scenarioName,
    setMapLayers,
  ]);

  return mapLayers;
};

export const SOLAR_IRRADIANCE = 'solar-irradiance';
export const LEGEND_COLOUR_ARRAY = ['#0000F5', '#EA3624', '#FFFF54'];
export const LEGEND_POINTS = 12;

export const THERMAL_NETWORK = 'thermal-network';

export const useMapLegends = () => {
  const mapLayers = useMapStore((state) => state.mapLayers);
  const mapLegends = useMapStore((state) => state.mapLayerLegends);
  const setMapLayerLegends = useMapStore((state) => state.setMapLayerLegends);

  const project = useSelector((state) => state.project.info.project);
  const scenarioName = useSelector((state) => state.project.info.scenario_name);

  useEffect(() => {
    if (mapLayers[SOLAR_IRRADIANCE]) {
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

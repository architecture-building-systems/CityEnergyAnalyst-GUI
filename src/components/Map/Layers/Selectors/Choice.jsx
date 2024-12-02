import { Select } from 'antd';
import { useMapStore } from '../../store/store';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';

const getChoices = async (
  layerCategory,
  layerName,
  parameterName,
  project,
  scenarioName,
  parameters,
) => {
  const resp = await axios.post(
    `${import.meta.env.VITE_CEA_URL}/api/map_layers/${layerCategory}/${layerName}/${parameterName}/choices`,
    {
      project,
      scenario_name: scenarioName,
      parameters,
    },
  );
  return resp.data;
};

const ChoiceSelector = ({
  parameterName,
  label,
  value,
  defaultValue,
  onChange,
  layerName,
  dependsOn,
}) => {
  const project = useSelector((state) => state.project.info.project);
  const scenarioName = useSelector((state) => state.project.info.scenario_name);
  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);
  const removeMapLayerParameter = useMapStore(
    (state) => state.removeMapLayerParameter,
  );
  const categoryInfo = useMapStore((state) => state.selectedMapCategory);

  const [selected, setSelected] = useState(value ?? defaultValue);
  const [choices, setChoices] = useState(null);

  const handleChange = (value) => {
    setSelected(value);
    onChange?.(value);
  };

  const dependsOnValues = useMemo(() => {
    if (!dependsOn) return null;
    return JSON.stringify(dependsOn.map((key) => mapLayerParameters?.[key]));
  }, [mapLayerParameters]);

  const dependsValid = useMemo(() => {
    if (!dependsOn) return true;
    return dependsOn.every((prop) => mapLayerParameters?.[prop] !== undefined);
  }, [mapLayerParameters]);

  useEffect(() => {
    // Only fetch if valid
    if (!dependsValid) return;

    const fetchChoices = async () => {
      try {
        const data = await getChoices(
          categoryInfo?.name,
          layerName,
          parameterName,
          project,
          scenarioName,
          mapLayerParameters ?? {},
        );
        setChoices(data);
      } catch (error) {
        console.error(error.response?.data);
        setChoices(null);
      }
    };

    fetchChoices();
  }, [dependsOnValues]);

  // Set the first choice as the default value
  useEffect(() => {
    if (choices) {
      handleChange(choices[0]);
    } else {
      handleChange(null);
    }
  }, [choices]);

  const options = choices?.map((choice) => ({
    value: choice,
    label: choice,
  }));

  if (!choices) return null;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div>
        <b>{label}</b>
      </div>
      <Select
        value={selected}
        onChange={handleChange}
        options={options}
        placement="topLeft"
        style={{ width: 200 }}
      />
    </div>
  );
};

export default ChoiceSelector;

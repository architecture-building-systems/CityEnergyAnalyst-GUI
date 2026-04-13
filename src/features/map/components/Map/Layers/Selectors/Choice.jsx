import { Select } from 'antd';
import { useMapStore } from 'features/map/stores/mapStore';
import { useSelectedMapCategoryInfo } from 'features/project/components/Cards/MapLayersCard/store';
import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from 'features/project/stores/projectStore';
import { apiClient } from 'lib/api/axios';
import { BinAnimationIcon } from 'assets/icons';
import DeleteChoiceModal from './DeleteChoiceModal';
import useDependsOn from './useDependsOn';

const DELETABLE_PARAMETERS = {
  'thermal-network': new Set(['network-name']),
};

const MULTI_PHASE_SUFFIX = ' (Multi-Phase)';

const isDeletableParameter = (layerName, parameterName) => {
  if (parameterName === 'whatif_name') return true;
  return DELETABLE_PARAMETERS[layerName]?.has(parameterName) ?? false;
};

const getDisplayName = (value) => {
  if (typeof value !== 'string') return value;
  if (value.endsWith(MULTI_PHASE_SUFFIX)) {
    return value.slice(0, -MULTI_PHASE_SUFFIX.length);
  }
  return value;
};

const getChoices = async (
  layerCategory,
  layerName,
  parameterName,
  project,
  scenarioName,
  parameters,
) => {
  const resp = await apiClient.post(
    `/api/map_layers/${layerCategory}/${layerName}/${parameterName}/choices`,
    {
      project,
      scenario_name: scenarioName,
      parameters,
    },
  );
  return resp.data;
};

const DeletableOption = ({ label, value, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  const onClick = (e) => {
    e.stopPropagation();
    onDelete?.(value);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexGrow: 1,
        }}
        title={label}
      >
        {label}
      </div>
      {isHovered && (
        <BinAnimationIcon
          style={{ padding: '2px 8px' }}
          className="cea-job-info-icon danger shake"
          onClick={onClick}
        />
      )}
    </div>
  );
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
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);
  const choicesRevision = useMapStore((state) => state.choicesRevision);
  const bumpChoicesRevision = useMapStore((state) => state.bumpChoicesRevision);
  const categoryInfo = useSelectedMapCategoryInfo();

  const [selected, setSelected] = useState(value ?? defaultValue);
  const [choices, setChoices] = useState(null);

  const [choiceToDelete, setChoiceToDelete] = useState(null);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const { dependsOnValues, dependsValid } = useDependsOn(
    dependsOn,
    mapLayerParameters,
  );

  const deletable = isDeletableParameter(layerName, parameterName);

  const handleChange = (value) => {
    setSelected(value);
    onChange?.(value);
  };

  const handleDelete = (choiceValue) => {
    setChoiceToDelete(choiceValue);
    setDeleteVisible(true);
  };

  useEffect(() => {
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
        if (Array.isArray(data)) {
          setChoices({ choices: data, default: data[0] });
        } else {
          setChoices(data);
        }
      } catch (error) {
        console.error(error.response?.data);
        setChoices(null);
      }
    };

    fetchChoices();
    // choicesRevision is intentionally in the deps: bumping it in mapStore
    // forces all ChoiceSelectors to refetch their options after external
    // filesystem changes (e.g. a successful network-layout run creating a
    // new network in `outputs/thermal-network/`).
  }, [dependsOnValues, dependsValid, choicesRevision]);

  useEffect(() => {
    if (choices) {
      const defaultValue = choices?.default ?? choices.choices?.[0];
      console.log(
        `[Choice] ${parameterName}: Using default value:`,
        defaultValue,
      );
      handleChange(defaultValue);
    } else {
      handleChange(null);
    }
  }, [choices]);

  const options = useMemo(() => {
    const raw = choices?.choices?.map((choice) => ({
      value: choice?.value ?? choice,
      label: choice?.label ?? choice,
    }));
    if (!raw?.length) return raw;
    if (!deletable) return raw;

    // Exclude the currently-selected value from the dropdown so the trigger
    // stays a plain string; mirrors the scenario dropdown delete pattern.
    return raw
      .filter((opt) => opt.value !== selected)
      .map((opt) => ({
        value: opt.value,
        label: (
          <DeletableOption
            label={opt.label}
            value={opt.value}
            onDelete={handleDelete}
          />
        ),
      }));
  }, [choices, deletable, selected]);

  if (!options?.length) return null;

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
        style={{ minWidth: 200 }}
        popupMatchSelectWidth={false}
        styles={{ popup: { root: { overflow: 'hidden', maxWidth: 300 } } }}
      />
      {deletable && (
        <DeleteChoiceModal
          visible={deleteVisible}
          setVisible={setDeleteVisible}
          layerCategory={categoryInfo?.name}
          layerName={layerName}
          parameterName={parameterName}
          parameterLabel={label}
          value={choiceToDelete}
          displayName={getDisplayName(choiceToDelete)}
          project={project}
          scenarioName={scenarioName}
          onDeleted={() => {
            setChoiceToDelete(null);
            bumpChoicesRevision();
          }}
        />
      )}
    </div>
  );
};

export default ChoiceSelector;

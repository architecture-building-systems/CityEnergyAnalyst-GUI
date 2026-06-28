import { Select } from 'antd';
import { useMapStore } from 'features/map/stores/mapStore';
import {
  useScopedMapLayerParameters,
  useScopedProjectScenario,
  useScopedSelectedCategoryInfo,
} from 'features/canvas/components/mapInstance';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from 'lib/api/axios';
import { scenarioHeaders } from 'lib/api/scenarioContext';
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
  childScenario = null,
) => {
  const resp = await apiClient.post(
    `/api/map_layers/${layerCategory}/${layerName}/${parameterName}/choices`,
    { parameters },
    { headers: scenarioHeaders({ project, scenarioName, childScenario }) },
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
  multi = false,
}) => {
  // Scoped to the column's scenario when rendered inside a
  // FeatureCardMap / BottomCard with override; falls back to the
  // project store outside any provider (main viewport).
  const { project, scenarioName, childScenario } = useScopedProjectScenario();
  const mapLayerParameters = useScopedMapLayerParameters();
  const choicesRevision = useMapStore((state) => state.choicesRevision);
  const bumpChoicesRevision = useMapStore((state) => state.bumpChoicesRevision);
  const categoryInfo = useScopedSelectedCategoryInfo();

  const [selected, setSelected] = useState(value ?? defaultValue);
  const [choices, setChoices] = useState(null);

  const [choiceToDelete, setChoiceToDelete] = useState(null);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const { dependsOnValues, dependsValid } = useDependsOn(
    dependsOn,
    mapLayerParameters,
  );

  // Multi-select parameters cannot use the hover-delete UX: the dropdown
  // is always showing all options so there is no natural "currently
  // selected" filter, and clicking a trash icon would conflict with
  // checkbox toggling.
  const deletable = !multi && isDeletableParameter(layerName, parameterName);

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
          childScenario,
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
  }, [categoryInfo?.name, layerName, parameterName, project, scenarioName, childScenario, dependsOnValues, dependsValid, choicesRevision]);

  useEffect(() => {
    if (choices) {
      const rawDefault = choices?.default ?? choices.choices?.[0];
      // In multi mode the parent expects an array; seed with the single
      // default so the backend receives [default] on first load and the
      // single-category branch is used until the user picks more.
      const initialValue = multi
        ? rawDefault != null
          ? [rawDefault?.value ?? rawDefault]
          : []
        : (rawDefault?.value ?? rawDefault);
      console.log(
        `[Choice] ${parameterName}: Using default value:`,
        initialValue,
      );
      handleChange(initialValue);
    } else {
      handleChange(multi ? [] : null);
    }
  }, [choices]);

  const options = useMemo(() => {
    const raw = choices?.choices?.map((choice) => ({
      value: choice?.value ?? choice,
      label: choice?.label ?? choice,
    }));
    if (!raw?.length) return raw;
    if (!deletable) return raw;

    // Exclude the currently-selected value from the dropdown so the
    // trigger stays a plain string; mirrors the scenario dropdown
    // delete pattern. BUT when there's only one option total, skip the
    // filter — otherwise the filtered list is empty and the whole
    // selector gets hidden by the `!options?.length` guard below. A
    // sole option is shown plain (no trash icon, since there's nothing
    // to switch to anyway) so users can still see which value is
    // active.
    if (raw.length <= 1) return raw;

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

  const selectProps = multi
    ? { mode: 'multiple', allowClear: false, maxTagCount: 'responsive' }
    : {};

  if (!options?.length) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div>
        <b>{label}</b>
      </div>
      <Select
        {...selectProps}
        value={selected}
        onChange={handleChange}
        options={options}
        placement="topLeft"
        style={{
          flex: 1,
          minWidth: 0,
        }}
        popupMatchSelectWidth={false}
        styles={{ popup: { root: { overflow: 'hidden', maxWidth: 360 } } }}
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
          childScenario={childScenario}
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

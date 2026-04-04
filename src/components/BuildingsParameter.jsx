import { AimOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import Icon from '@ant-design/icons';
import { Button, Divider, Dropdown, Select, Tooltip } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FormField } from 'components/Parameter';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import { getMainUseType } from 'features/map/utils/constructionColors';
import useBuildingSelectionStore, {
  useBuildingSelectionActive,
  useBuildingSelectionBuildings,
  useBuildingSelectionOwner,
  useStartBuildingSelection,
  useConfirmBuildingSelection,
  useCancelBuildingSelection,
} from 'stores/buildingSelectionStore';

// Two overlapping squares – filled region shows the boolean result
const UnionSvg = () => (
  <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor">
    <rect x="1" y="1" width="9" height="9" rx="1" opacity="0.85" />
    <rect x="6" y="6" width="9" height="9" rx="1" opacity="0.85" />
  </svg>
);

const IntersectSvg = () => (
  <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor">
    <rect x="1" y="1" width="9" height="9" rx="1" opacity="0.3" />
    <rect x="6" y="6" width="9" height="9" rx="1" opacity="0.3" />
    <rect x="6" y="6" width="4" height="4" opacity="0.85" />
  </svg>
);

const UnionIcon = (props) => <Icon component={UnionSvg} {...props} />;
const IntersectIcon = (props) => <Icon component={IntersectSvg} {...props} />;

const MapSelectionButtons = ({
  selectionActive,
  onStart,
  onConfirm,
  onCancel,
}) =>
  !selectionActive ? (
    <Button
      size="small"
      icon={<AimOutlined />}
      onClick={onStart}
      style={{ paddingRight: 7, gap: 2 }}
    >
      Select on Map
    </Button>
  ) : (
    <>
      <Button
        size="small"
        type="primary"
        icon={<CheckOutlined />}
        onClick={onConfirm}
      >
        Done
      </Button>
      <Button size="small" icon={<CloseOutlined />} onClick={onCancel} danger>
        Cancel
      </Button>
    </>
  );

const TypeFilterDropdown = ({ label, typeMap, selectedKeys, onChangeKeys }) => {
  const items = Object.entries(typeMap).map(([type, buildings]) => ({
    key: type,
    label: `${type} (${buildings.length})`,
  }));

  const handleChange = ({ selectedKeys: keys }) => onChangeKeys(keys);

  return (
    <Dropdown
      menu={{
        items,
        selectable: true,
        multiple: true,
        selectedKeys,
        onSelect: handleChange,
        onDeselect: handleChange,
      }}
      disabled={!items.length}
      trigger={['click']}
    >
      <Button size="small">{label}</Button>
    </Dropdown>
  );
};

const combineSelections = (
  constKeys,
  useKeys,
  constTypeMap,
  useTypeMap,
  mode,
) => {
  const constSet = new Set(constKeys.flatMap((k) => constTypeMap[k] ?? []));
  const useSet = new Set(useKeys.flatMap((k) => useTypeMap[k] ?? []));

  // If only one dropdown has selections, return that set
  if (!constKeys.length && !useKeys.length) return [];
  if (!constKeys.length) return [...useSet];
  if (!useKeys.length) return [...constSet];

  if (mode === 'intersect') {
    return [...constSet].filter((b) => useSet.has(b));
  }
  return [...new Set([...constSet, ...useSet])];
};

// Wrapper that receives form props (value/onChange) from Form.Item and forwards
// them only to the Select, while also rendering the map selection buttons below.
const BuildingsSelectInput = ({
  value,
  onChange,
  choices,
  selectionActive,
  onStart,
  onConfirm,
  onCancel,
  constTypeMap,
  useTypeMap,
}) => {
  const [constKeys, setConstKeys] = useState([]);
  const [useKeys, setUseKeys] = useState([]);
  const [combineMode, setCombineMode] = useState('union');

  const options = (choices ?? []).map((choice) => ({
    label: choice,
    value: choice,
  }));

  const handleChange = (val) => {
    onChange(val);
    if (selectionActive) useBuildingSelectionStore.getState().setBuildings(val);
  };

  const applyTypeFilters = (nextConstKeys, nextUseKeys, nextMode) => {
    if (!nextConstKeys.length && !nextUseKeys.length) {
      handleChange([]);
      return;
    }

    const result = combineSelections(
      nextConstKeys,
      nextUseKeys,
      constTypeMap,
      useTypeMap,
      nextMode,
    );
    handleChange(result);
  };

  const handleConstKeysChange = (keys) => {
    setConstKeys(keys);
    applyTypeFilters(keys, useKeys, combineMode);
  };

  const handleUseKeysChange = (keys) => {
    setUseKeys(keys);
    applyTypeFilters(constKeys, keys, combineMode);
  };

  const handleSetMode = (mode) => {
    setCombineMode(mode);
    applyTypeFilters(constKeys, useKeys, mode);
  };

  return (
    <div>
      <Select
        value={value}
        onChange={handleChange}
        options={options}
        mode="multiple"
        tokenSeparators={[',']}
        style={{
          width: '100%',
          ...(selectionActive && { boxShadow: '0 0 0 2px #1677ff' }),
        }}
        placeholder="All Buildings"
        maxTagCount={10}
        popupRender={(menu) => (
          <div>
            <div style={{ padding: '8px', textAlign: 'center' }}>
              <Button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleChange(choices ?? []);
                }}
                style={{ width: '45%' }}
              >
                Select All
              </Button>
              <Button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleChange([]);
                }}
                style={{ width: '45%' }}
              >
                Unselect All
              </Button>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            {menu}
          </div>
        )}
      />
      <div style={{ display: 'flex', gap: 4, marginBlock: 12 }}>
        <MapSelectionButtons
          selectionActive={selectionActive}
          onStart={onStart}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
        {!selectionActive && (
          <>
            <TypeFilterDropdown
              label="By Const. Type"
              typeMap={constTypeMap}
              selectedKeys={constKeys}
              onChangeKeys={handleConstKeysChange}
            />
            <TypeFilterDropdown
              label="By Use Type"
              typeMap={useTypeMap}
              selectedKeys={useKeys}
              onChangeKeys={handleUseKeysChange}
            />
            <Tooltip title="Union">
              <Button
                size="small"
                icon={<UnionIcon />}
                type={combineMode === 'union' ? 'primary' : 'default'}
                onClick={() => handleSetMode('union')}
                style={{ aspectRatio: 1, padding: 0 }}
              />
            </Tooltip>
            <Tooltip title="Intersect">
              <Button
                size="small"
                icon={<IntersectIcon />}
                type={combineMode === 'intersect' ? 'primary' : 'default'}
                onClick={() => handleSetMode('intersect')}
                style={{ aspectRatio: 1, padding: 0 }}
              />
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
};

const BuildingsParameter = ({
  name,
  help,
  choices,
  value,
  nullable,
  setFieldsValue,
  form,
}) => {
  const idRef = useRef(Symbol());
  const globalSelectionActive = useBuildingSelectionActive();
  const sessionOwner = useBuildingSelectionOwner();
  const selectionBuildings = useBuildingSelectionBuildings();
  const startSelection = useStartBuildingSelection();
  const confirmSelection = useConfirmBuildingSelection();
  const cancelSelection = useCancelBuildingSelection();

  const selectionActive =
    globalSelectionActive && sessionOwner === idRef.current;

  const { data: inputData } = useInputs();
  const choicesSet = useMemo(() => new Set(choices ?? []), [choices]);

  const { constTypeMap, useTypeMap } = useMemo(() => {
    const constMap = {};
    const useMap = {};
    const features = inputData?.geojsons?.zone?.features ?? [];
    for (const feature of features) {
      const name = feature?.properties?.name;
      if (!name || !choicesSet.has(name)) continue;

      const constType = feature.properties.const_type;
      if (constType) {
        (constMap[constType] ??= []).push(name);
      }

      const mainUse = getMainUseType(feature.properties);
      if (mainUse) {
        (useMap[mainUse] ??= []).push(name);
      }
    }
    return { constTypeMap: constMap, useTypeMap: useMap };
  }, [inputData, choicesSet]);

  const previousValueRef = useRef(null);

  const handleStartSelection = () => {
    const currentValue = form.getFieldValue(name) ?? [];
    previousValueRef.current = currentValue;
    startSelection(choices, idRef.current);
    // Pre-populate with current selection
    useBuildingSelectionStore.getState().setBuildings(currentValue);
  };

  const handleConfirm = useCallback(() => {
    confirmSelection();
  }, [confirmSelection]);

  const handleCancel = useCallback(() => {
    cancelSelection();
    setFieldsValue({ [name]: previousValueRef.current });
  }, [cancelSelection, setFieldsValue, name]);

  // Sync map selections to form field in real-time (only for the owning instance)
  useEffect(() => {
    if (selectionActive) {
      setFieldsValue({ [name]: selectionBuildings });
    }
  }, [selectionActive, selectionBuildings, name, setFieldsValue]);

  // Cancel selection when component unmounts (e.g. user switches tools)
  useEffect(() => {
    const id = idRef.current;
    return () => {
      const state = useBuildingSelectionStore.getState();
      if (state.active && state.sessionOwner === id) {
        state.cancelSelection();
      }
    };
  }, []);

  // Escape key to cancel (only for the owning instance)
  useEffect(() => {
    if (!selectionActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionActive, handleCancel]);

  return (
    <FormField
      name={name}
      help={help}
      rules={[
        {
          validator: (_, value) => {
            if (!Array.isArray(choices))
              return Promise.reject('No valid choices available');

            if (value === null) {
              if (nullable) return Promise.resolve();
              return Promise.reject('Select at least one choice');
            }
            if (!Array.isArray(value))
              return Promise.reject('Value must be an array');
            const invalidChoices = value.filter((c) => !choices.includes(c));
            if (invalidChoices.length) {
              return Promise.reject(
                `${invalidChoices.join(', ')} ${
                  invalidChoices.length > 1
                    ? 'are not valid choices'
                    : 'is not a valid choice'
                }`,
              );
            }
            return Promise.resolve();
          },
        },
      ]}
      initialValue={value}
    >
      <BuildingsSelectInput
        choices={choices}
        selectionActive={selectionActive}
        onStart={handleStartSelection}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        constTypeMap={constTypeMap}
        useTypeMap={useTypeMap}
      />
    </FormField>
  );
};

export default BuildingsParameter;

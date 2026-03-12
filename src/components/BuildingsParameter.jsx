import { AimOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Divider, Select } from 'antd';
import { useCallback, useEffect, useRef } from 'react';

import { FormField } from 'components/Parameter';
import useBuildingSelectionStore, {
  useBuildingSelectionActive,
  useBuildingSelectionBuildings,
  useStartBuildingSelection,
  useConfirmBuildingSelection,
  useCancelBuildingSelection,
} from 'stores/buildingSelectionStore';

const MapSelectionButtons = ({
  selectionActive,
  onStart,
  onConfirm,
  onCancel,
}) =>
  !selectionActive ? (
    <Button size="small" icon={<AimOutlined />} onClick={onStart}>
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

// Wrapper that receives form props (value/onChange) from Form.Item and forwards
// them only to the Select, while also rendering the map selection buttons below.
const BuildingsSelectInput = ({
  value,
  onChange,
  options,
  selectionActive,
  selectAll,
  unselectAll,
  onStart,
  onConfirm,
  onCancel,
}) => (
  <div>
    <Select
      value={value}
      onChange={onChange}
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
            <Button onMouseDown={selectAll} style={{ width: '45%' }}>
              Select All
            </Button>
            <Button onMouseDown={unselectAll} style={{ width: '45%' }}>
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
    </div>
  </div>
);

const BuildingsParameter = ({
  name,
  help,
  choices,
  value,
  nullable,
  setFieldsValue,
  form,
}) => {
  const selectionActive = useBuildingSelectionActive();
  const selectionBuildings = useBuildingSelectionBuildings();
  const startSelection = useStartBuildingSelection();
  const confirmSelection = useConfirmBuildingSelection();
  const cancelSelection = useCancelBuildingSelection();

  const previousValueRef = useRef(null);

  const options = choices.map((choice) => ({ label: choice, value: choice }));

  const selectAll = (e) => {
    e.preventDefault();
    setFieldsValue({ [name]: choices });
  };

  const unselectAll = (e) => {
    e.preventDefault();
    setFieldsValue({ [name]: [] });
  };

  const handleStartSelection = () => {
    const currentValue = form.getFieldValue(name) ?? [];
    previousValueRef.current = currentValue;
    startSelection(choices, (buildings) => {
      setFieldsValue({ [name]: buildings });
    });
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

  // Sync map selections to form field in real-time
  useEffect(() => {
    if (selectionActive) {
      setFieldsValue({ [name]: selectionBuildings });
    }
  }, [selectionActive, selectionBuildings, name, setFieldsValue]);

  // Cancel selection when component unmounts (e.g. user switches tools)
  useEffect(() => {
    return () => {
      if (useBuildingSelectionStore.getState().active) {
        useBuildingSelectionStore.getState().cancelSelection();
      }
    };
  }, []);

  // Escape key to cancel
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
        options={options}
        selectionActive={selectionActive}
        selectAll={selectAll}
        unselectAll={unselectAll}
        onStart={handleStartSelection}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </FormField>
  );
};

export default BuildingsParameter;

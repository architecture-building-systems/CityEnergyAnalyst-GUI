import { useState } from 'react';
import { Modal, Checkbox, Radio, Button, Empty } from 'antd';

/**
 * Modal for picking scenarios or what-ifs.
 *
 * Props:
 *   open       — visibility
 *   mode       — 'scenario' | 'whatif'
 *   single     — if true, radio select (add-column mode); otherwise checkbox (compare mode)
 *   scenarios  — available scenario names (used when mode='scenario')
 *   whatifs    — available what-if names (used when mode='whatif')
 *   scenario   — current active scenario (pre-selected for scenario mode)
 *   onConfirm  — (selected: string[]) => void  (always array, even for single mode)
 *   onCancel   — () => void
 */
const ScenarioPicker = ({
  open,
  mode,
  single = false,
  scenarios = [],
  whatifs = [],
  scenario,
  onConfirm,
  onCancel,
}) => {
  const items = mode === 'scenario' ? scenarios : whatifs;

  const titleMap = {
    scenario: single ? 'Add a Scenario Column' : 'Select Scenarios to Compare',
    whatif: single ? 'Add a What-if Column' : 'Select What-ifs to Compare',
  };

  // Pre-select the current scenario in multi-select scenario mode
  const [selected, setSelected] = useState(() =>
    !single && mode === 'scenario' && scenario ? [scenario] : [],
  );
  const [singleValue, setSingleValue] = useState(null);

  const handleOk = () => {
    if (single) {
      if (singleValue) onConfirm([singleValue]);
    } else {
      if (selected.length > 0) onConfirm(selected);
    }
  };

  const toggle = (item) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item],
    );
  };

  const okDisabled = single ? !singleValue : selected.length === 0;
  const okLabel = single
    ? 'Add'
    : `Compare (${selected.length})`;

  return (
    <Modal
      open={open}
      title={titleMap[mode]}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="ok"
          type="primary"
          disabled={okDisabled}
          onClick={handleOk}
        >
          {okLabel}
        </Button>,
      ]}
    >
      {items.length === 0 ? (
        <Empty
          description={
            mode === 'scenario'
              ? 'No scenarios found.'
              : 'No what-ifs found for this scenario.'
          }
        />
      ) : (
        <div style={listStyle}>
          {single ? (
            <Radio.Group
              value={singleValue}
              onChange={(e) => setSingleValue(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {items.map((item) => (
                <Radio key={item} value={item} style={itemStyle}>
                  {item}
                </Radio>
              ))}
            </Radio.Group>
          ) : (
            items.map((item) => (
              <div key={item} style={itemStyle}>
                <Checkbox
                  checked={selected.includes(item)}
                  onChange={() => toggle(item)}
                >
                  {item}
                </Checkbox>
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
};

const listStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: 400,
  overflowY: 'auto',
};

const itemStyle = {
  padding: '6px 4px',
  borderRadius: 4,
};

export default ScenarioPicker;

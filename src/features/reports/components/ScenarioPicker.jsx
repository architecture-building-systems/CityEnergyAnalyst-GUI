import { useState } from 'react';
import { Modal, Checkbox, Button, Empty } from 'antd';

/**
 * Modal for picking scenarios or what-ifs before entering comparison mode.
 *
 * Props:
 *   open       — visibility
 *   mode       — 'scenario' | 'whatif'
 *   scenarios  — available scenario names (used when mode='scenario')
 *   whatifs    — available what-if names (used when mode='whatif')
 *   scenario   — current active scenario (pre-selected for scenario mode)
 *   onConfirm  — (selected: string[]) => void
 *   onCancel   — () => void
 */
const ScenarioPicker = ({
  open,
  mode,
  scenarios = [],
  whatifs = [],
  scenario,
  onConfirm,
  onCancel,
}) => {
  const items = mode === 'scenario' ? scenarios : whatifs;
  const title =
    mode === 'scenario' ? 'Select Scenarios to Compare' : 'Select What-ifs to Compare';

  // Pre-select the current scenario in scenario mode
  const [selected, setSelected] = useState(() =>
    mode === 'scenario' && scenario ? [scenario] : [],
  );

  const toggle = (item) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item],
    );
  };

  const handleOk = () => {
    if (selected.length > 0) {
      onConfirm(selected);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="ok"
          type="primary"
          disabled={selected.length === 0}
          onClick={handleOk}
        >
          Compare ({selected.length})
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
          {items.map((item) => (
            <div key={item} style={itemStyle}>
              <Checkbox
                checked={selected.includes(item)}
                onChange={() => toggle(item)}
              >
                {item}
              </Checkbox>
            </div>
          ))}
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

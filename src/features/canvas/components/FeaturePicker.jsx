import { useState } from 'react';
import { Modal, Checkbox, Radio, Button, Spin } from 'antd';

import { useFetchFeatures } from '../hooks/useCanvasData';

/**
 * Modal for picking feature result sets.
 *
 * Props:
 *   open       — visibility
 *   single     — if true, radio select (add-column); otherwise checkbox (compare entry)
 *   onConfirm  — (selected: { key, label }[]) => void
 *   onCancel   — () => void
 */
const FeaturePicker = ({ open, single = false, onConfirm, onCancel }) => {
  const { data: features = [], isLoading } = useFetchFeatures();
  const [selected, setSelected] = useState([]);
  const [singleValue, setSingleValue] = useState(null);

  const toggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleOk = () => {
    if (single) {
      const feat = features.find((f) => f.key === singleValue);
      if (feat) onConfirm([feat]);
    } else {
      const feats = features.filter((f) => selected.includes(f.key));
      if (feats.length > 0) onConfirm(feats);
    }
  };

  const okDisabled = single ? !singleValue : selected.length === 0;
  const okLabel = single ? 'Add' : `Compare (${selected.length})`;

  return (
    <Modal
      open={open}
      title={single ? 'Add a Feature Column' : 'Select Features to Compare'}
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
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin />
        </div>
      ) : (
        <div style={listStyle}>
          {single ? (
            <Radio.Group
              value={singleValue}
              onChange={(e) => setSingleValue(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {features.map((f) => (
                <Radio key={f.key} value={f.key} style={itemStyle}>
                  {f.label}
                </Radio>
              ))}
            </Radio.Group>
          ) : (
            features.map((f) => (
              <div key={f.key} style={itemStyle}>
                <Checkbox
                  checked={selected.includes(f.key)}
                  onChange={() => toggle(f.key)}
                >
                  {f.label}
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

export default FeaturePicker;

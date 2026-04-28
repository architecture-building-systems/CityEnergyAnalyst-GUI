import { useEffect, useMemo, useState } from 'react';
import { Alert, Checkbox, ConfigProvider, Modal } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useFetchScenarios } from '../hooks/useCanvasData';
import { useCanvasStore } from '../stores/canvasStore';

const MAX_TOTAL_COLUMNS = 4;
const MAX_PICKS = MAX_TOTAL_COLUMNS - 1; // origin column is implicit

/**
 * Add-Scenario-to-compare picker. Opened from the `+` button next
 * to the scenario title in the launch view (and the floating `+`
 * in compare view, if added later).
 *
 * Scope is scenarios-only — the previous What-ifs tab was retired
 * in favour of a simpler single-list UI. Origin is always the
 * project's currently-active scenario (leftmost column); the user
 * picks up to 3 sibling scenarios to compare against.
 *
 * Pre-fills the picks from `comparisonSetup` if the user has
 * compared on this canvas before, so re-opening the picker shows
 * their previous selection.
 */
const CompareModal = ({ open, onCancel }) => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const enterInterScenario = useCanvasStore((s) => s.enterInterScenario);
  const comparisonSetup = useCanvasStore((s) => s.comparisonSetup);

  const { data: siblingScenarios = [] } = useFetchScenarios(project);

  // Filter out the origin so the user can't pick it twice.
  const scenarioOptions = useMemo(
    () =>
      (siblingScenarios || [])
        .filter((s) => s !== scenario)
        .map((s) => ({ label: s, value: s })),
    [siblingScenarios, scenario],
  );

  const [picks, setPicks] = useState([]);

  // Re-seed from saved comparisonSetup whenever the modal opens.
  // Fresh selection on each open avoids the confusing case where a
  // partial selection from a previous open hangs around after Cancel.
  useEffect(() => {
    if (!open) return;
    if (comparisonSetup?.kind === 'inter-scenario') {
      setPicks(comparisonSetup.scenarios || []);
    } else {
      setPicks([]);
    }
  }, [open, comparisonSetup]);

  const remaining = MAX_PICKS - picks.length;

  const handleChange = (next) => {
    if (next.length > MAX_PICKS) {
      setPicks(next.slice(0, MAX_PICKS));
      return;
    }
    setPicks(next);
  };

  const handleOk = () => {
    if (picks.length === 0) return;
    // Origin first, then user's picks (in pick order).
    enterInterScenario([scenario, ...picks]);
    onCancel?.();
  };

  // Disable individual options once the cap is reached so the user
  // gets immediate feedback. Already-selected items stay clickable
  // so they can be deselected.
  const decoratedOptions = scenarioOptions.map((opt) => ({
    ...opt,
    disabled: !picks.includes(opt.value) && picks.length >= MAX_PICKS,
  }));

  const isEmpty = scenarioOptions.length === 0;

  return (
    // CEA-purple primary so the modal's antd surfaces (OK button,
    // checked checkboxes) match the canvas's accent palette
    // instead of the default antd blue.
    <ConfigProvider theme={{ token: { colorPrimary: CEA_PURPLE } }}>
      <Modal
        open={open}
        title="Add Scenario to compare"
        okText={`Compare ${picks.length + 1} scenarios`}
        cancelText="Cancel"
        onOk={handleOk}
        onCancel={onCancel}
        okButtonProps={{ disabled: picks.length === 0 }}
        destroyOnClose
      >
        <div style={originRowStyle}>
          <span style={originBadgeStyle}>Origin</span>
          <span style={{ color: '#222' }}>{scenario}</span>
        </div>
        {isEmpty ? (
          <Alert
            type="info"
            showIcon
            message="No sibling scenarios in this project."
          />
        ) : (
          <>
            <Checkbox.Group
              value={picks}
              onChange={handleChange}
              options={decoratedOptions}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            />
            <div style={remainingHintStyle}>
              {remaining > 0
                ? `Up to ${remaining} more (4 columns max).`
                : 'Maximum reached (4 columns).'}
            </div>
          </>
        )}
      </Modal>
    </ConfigProvider>
  );
};

// CEA accent purple — matches the navigator toggles' "on" track
// and the canvas-purple blink animation. Used here for the
// Origin badge background and (via ConfigProvider) the OK button
// + checked-checkbox tint.
const CEA_PURPLE = '#AC6080';

const originRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
  paddingBottom: 10,
  borderBottom: '1px solid #e8e8e8',
};

const originBadgeStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#fff',
  background: CEA_PURPLE,
  padding: '2px 8px',
  borderRadius: 4,
};

const remainingHintStyle = {
  marginTop: 12,
  fontSize: 12,
  color: '#94A3B8',
};

export default CompareModal;

import { useEffect, useMemo, useState } from 'react';
import { Alert, Checkbox, Modal, Tabs } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useFetchScenarios, useFetchWhatifs } from '../hooks/useCanvasData';
import { useCanvasStore } from '../stores/canvasStore';

const MAX_TOTAL_COLUMNS = 4;
const MAX_PICKS = MAX_TOTAL_COLUMNS - 1; // origin column is implicit

/**
 * Compare-mode picker. Two tabs (Scenarios / What-ifs) with
 * multi-select capped at 3 picks (4 total columns including the
 * origin). Confirming dispatches into `enterInterScenario` or
 * `enterInterWhatif` with `[origin, ...picks]`.
 *
 * The origin is always the project's currently-active scenario —
 * the leftmost column in the resulting comparison view. Editing
 * affordances only appear on the origin column (handled in
 * `CanvasColumn` / `FeatureCardShell` via `columnIndex === 0`).
 *
 * Pre-fills the picks from `comparisonSetup` if the user has
 * compared before on this canvas, so re-entering the picker shows
 * their previous selection.
 */
const CompareModal = ({ open, onCancel }) => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const enterInterScenario = useCanvasStore((s) => s.enterInterScenario);
  const enterInterWhatif = useCanvasStore((s) => s.enterInterWhatif);
  const comparisonSetup = useCanvasStore((s) => s.comparisonSetup);

  const { data: siblingScenarios = [] } = useFetchScenarios(project);
  const { data: whatifs = [] } = useFetchWhatifs(project, scenario);

  // The origin is always the project's currently-active scenario,
  // which is itself a "scenario" entity. Filter it out of the pick
  // list so the user can't pick the origin twice.
  const scenarioOptions = useMemo(
    () =>
      (siblingScenarios || []).filter((s) => s !== scenario).map((s) => ({
        label: s,
        value: s,
      })),
    [siblingScenarios, scenario],
  );

  const whatifOptions = useMemo(
    () => (whatifs || []).map((w) => ({ label: w, value: w })),
    [whatifs],
  );

  const initialTab =
    comparisonSetup?.kind === 'inter-whatif' ? 'whatifs' : 'scenarios';
  const [tab, setTab] = useState(initialTab);
  const [scenarioPicks, setScenarioPicks] = useState([]);
  const [whatifPicks, setWhatifPicks] = useState([]);

  // Re-seed from the saved comparisonSetup whenever the modal opens.
  // The picker is a "fresh selection every time" UX — avoids the
  // confusing case where a partial selection from a previous open
  // hangs around after Cancel.
  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    if (comparisonSetup?.kind === 'inter-scenario') {
      setScenarioPicks(comparisonSetup.scenarios || []);
      setWhatifPicks([]);
    } else if (comparisonSetup?.kind === 'inter-whatif') {
      setScenarioPicks([]);
      setWhatifPicks(comparisonSetup.whatifs || []);
    } else {
      setScenarioPicks([]);
      setWhatifPicks([]);
    }
  }, [open, comparisonSetup, initialTab]);

  const picks = tab === 'scenarios' ? scenarioPicks : whatifPicks;
  const setPicks = tab === 'scenarios' ? setScenarioPicks : setWhatifPicks;

  const remaining = MAX_PICKS - picks.length;

  const handleChange = (next) => {
    // Cap at MAX_PICKS by silently dropping the latest pick over
    // the limit. The disabled-checkbox treatment below also
    // prevents reaching this branch under normal use.
    if (next.length > MAX_PICKS) {
      setPicks(next.slice(0, MAX_PICKS));
      return;
    }
    setPicks(next);
  };

  const handleOk = () => {
    if (tab === 'scenarios') {
      if (scenarioPicks.length === 0) return;
      // Origin first, then user's picks (in pick order).
      enterInterScenario([scenario, ...scenarioPicks]);
    } else {
      if (whatifPicks.length === 0) return;
      // For what-if comparison the parent scenario is the origin;
      // each "column" is a what-if under that scenario. The
      // leftmost column has no what-if assigned (it represents the
      // base scenario itself).
      enterInterWhatif(scenario, [null, ...whatifPicks]);
    }
    onCancel?.();
  };

  // Disable individual options once the cap is reached so the user
  // gets immediate feedback instead of a silent slice. Already-
  // selected items stay clickable so they can be deselected.
  const decorateOptions = (options, selected) =>
    options.map((opt) => ({
      ...opt,
      disabled:
        !selected.includes(opt.value) && selected.length >= MAX_PICKS,
    }));

  const isEmpty =
    (tab === 'scenarios' && scenarioOptions.length === 0) ||
    (tab === 'whatifs' && whatifOptions.length === 0);

  return (
    <Modal
      open={open}
      title="Compare"
      okText={
        tab === 'scenarios'
          ? `Compare ${scenarioPicks.length + 1} scenarios`
          : `Compare ${whatifPicks.length + 1} columns`
      }
      cancelText="Cancel"
      onOk={handleOk}
      onCancel={onCancel}
      okButtonProps={{
        disabled: picks.length === 0,
      }}
      destroyOnClose
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'scenarios',
            label: 'Scenarios',
            children: (
              <PickList
                origin={scenario}
                originLabel="Origin (current scenario)"
                options={decorateOptions(scenarioOptions, scenarioPicks)}
                value={scenarioPicks}
                onChange={(next) => {
                  setTab('scenarios');
                  handleChange(next);
                }}
                emptyMessage="No sibling scenarios in this project."
                remaining={remaining}
              />
            ),
          },
          {
            key: 'whatifs',
            label: 'What-ifs',
            children: (
              <PickList
                origin={scenario}
                originLabel={`Origin (${scenario}, base)`}
                options={decorateOptions(whatifOptions, whatifPicks)}
                value={whatifPicks}
                onChange={(next) => {
                  setTab('whatifs');
                  handleChange(next);
                }}
                emptyMessage="No what-ifs configured for this scenario."
                remaining={remaining}
              />
            ),
          },
        ]}
      />
      {isEmpty && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 12 }}
          message="Nothing to compare against in this tab."
        />
      )}
    </Modal>
  );
};

const PickList = ({
  originLabel,
  options,
  value,
  onChange,
  emptyMessage,
  remaining,
}) => (
  <div>
    <div style={originRowStyle}>
      <span style={originBadgeStyle}>Origin</span>
      <span style={{ color: '#222' }}>{originLabel}</span>
    </div>
    {options.length === 0 ? (
      <div style={{ color: '#94A3B8', fontSize: 12 }}>{emptyMessage}</div>
    ) : (
      <>
        <Checkbox.Group
          value={value}
          onChange={onChange}
          options={options}
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        />
        <div style={remainingHintStyle}>
          {remaining > 0
            ? `Up to ${remaining} more (4 columns max).`
            : 'Maximum reached (4 columns).'}
        </div>
      </>
    )}
  </div>
);

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
  background: '#1470AF',
  padding: '2px 8px',
  borderRadius: 4,
};

const remainingHintStyle = {
  marginTop: 12,
  fontSize: 12,
  color: '#94A3B8',
};

export default CompareModal;

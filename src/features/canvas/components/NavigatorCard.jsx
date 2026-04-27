import { useState } from 'react';
import {
  Button,
  ConfigProvider,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Tooltip,
  message as antdMessage,
} from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { StartOverIcon } from 'assets/icons';

import InfoTooltip from 'components/InfoTooltip';
import useNavigationStore from 'stores/navigationStore';
import routes from 'constants/routes.json';
import { useProjectStore } from 'features/project/stores/projectStore';

import { useCanvasStore } from '../stores/canvasStore';
import { deleteTempCanvas, saveTempCanvas } from '../api/canvas';

/**
 * Navigator card — top strip of the Canvas Builder page.
 *
 * Mirrors the main viewport's black toolbar height (≈52px) but uses
 * a white background so it reads as a sibling to the canvas and plot
 * tool cards rather than a toolbar in the traditional sense. Holds
 * navigation actions, view toggles, the dashboard switcher, and the
 * Save / Discard buttons that drive the persistence flow.
 *
 * Currently visible controls:
 *   - Return       → back to the project page
 *   - Start Over   → delete the active draft and clear comparison
 *                    state (with confirm)
 *   - Sync Maps    → mirror every map card to the overview map
 *   - Fix Layout   → lock card positions and sizes
 *   - Enable Edit  → show editing controls (default on); off
 *                    hides Edit / Delete / `+` / toolbars / range
 *                    inputs for a clean snapshot
 *   - Auto Save    → flush every change to a backend draft
 *                    (default on); off keeps everything in memory
 *                    until Save is clicked
 *   - Save         → promote the active draft to a saved canvas;
 *                    prompts for a name on first save
 *   - Dashboard    → dropdown to switch between saved dashboards
 *                    (stubbed — list-load wiring lands in a later
 *                    phase)
 *
 * Placeholder slot:
 *   - Export
 */
const NavigatorCard = () => {
  const { push } = useNavigationStore();
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const startOverStore = useCanvasStore((s) => s.startOver);
  const mapsLinked = useCanvasStore((s) => s.mapsLinked);
  const setMapsLinked = useCanvasStore((s) => s.setMapsLinked);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const setEnableEdit = useCanvasStore((s) => s.setEnableEdit);
  const fixLayout = useCanvasStore((s) => s.fixLayout);
  const setFixLayout = useCanvasStore((s) => s.setFixLayout);
  const autoSave = useCanvasStore((s) => s.autoSave);
  const setAutoSave = useCanvasStore((s) => s.setAutoSave);
  const tempUuid = useCanvasStore((s) => s.tempUuid);
  const canvasName = useCanvasStore((s) => s.canvasName);
  const markSaved = useCanvasStore((s) => s.markSaved);

  // Save-name prompt — only used the first time a draft is saved
  // (or when the user wants to Save As, in a later phase). Once the
  // canvas has a `canvasName`, Save commits directly under that
  // name without re-prompting.
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [nameError, setNameError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleReturn = () => {
    push(routes.PROJECT);
  };

  /**
   * Run Save against the backend and commit the result locally.
   * Surfaces 409 conflicts back into the name-prompt modal so the
   * user can pick a different name; other errors fall through to
   * a toast.
   */
  const commitSave = async (name) => {
    if (!tempUuid) return;
    setSaving(true);
    try {
      const result = await saveTempCanvas({
        project,
        scenario,
        uuid: tempUuid,
        name,
      });
      markSaved(result.name);
      setNamePromptOpen(false);
      setPendingName('');
      setNameError(null);
      antdMessage.success(`Saved as "${result.name}"`);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 409 || status === 400) {
        // Bounce back into the prompt; let the user fix the name.
        setNameError(detail || 'Could not save with that name');
        setNamePromptOpen(true);
      } else {
        antdMessage.error('Save failed — see console for details');
        // eslint-disable-next-line no-console
        console.error('Canvas save failed', err);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!tempUuid) return;
    if (canvasName) {
      // The canvas already has a committed name — overwrite without
      // re-prompting. (Save As lives in a later phase.)
      commitSave(canvasName);
    } else {
      setPendingName('');
      setNameError(null);
      setNamePromptOpen(true);
    }
  };

  const handleStartOver = () => {
    Modal.confirm({
      title: 'Start over?',
      content:
        'All cards will be removed and the canvas will return to its launch state. Any unsaved draft will be discarded.',
      okText: 'Start over',
      cancelText: 'Cancel',
      onOk: async () => {
        // Clean up the server-side temp before resetting local
        // state. If the API call fails we still reset locally —
        // a stranded temp folder is a recoverable inconvenience,
        // but blocking the user on it would not be.
        if (tempUuid) {
          try {
            await deleteTempCanvas({ project, scenario, uuid: tempUuid });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to delete temp canvas', err);
          }
        }
        startOverStore();
      },
    });
  };

  const saveDisabled = !tempUuid || saving;
  const saveTooltip = saveDisabled
    ? tempUuid
      ? 'Saving…'
      : 'No changes to save'
    : canvasName
      ? `Save changes to "${canvasName}"`
      : 'Save as a new canvas';

  return (
    <div style={cardStyle}>
      <Space size="small" align="center">
        <Button icon={<LeftOutlined />} onClick={handleReturn}>
          Return
        </Button>
        <Tooltip title="Start Over">
          <Button
            icon={<StartOverIcon />}
            onClick={handleStartOver}
            aria-label="Start over"
          />
        </Tooltip>
        <NavigatorToggle
          checked={mapsLinked}
          onChange={setMapsLinked}
          label="Sync Maps"
          ariaLabel="Sync map cards with overview"
          tooltipKey="canvas-sync-maps"
        />
        <NavigatorToggle
          checked={fixLayout}
          onChange={setFixLayout}
          label="Fix Layout"
          ariaLabel="Lock card positions and sizes"
        />
        <NavigatorToggle
          checked={enableEdit}
          onChange={setEnableEdit}
          label="Enable Edit"
          ariaLabel="Show editing controls"
        />
        <NavigatorToggle
          checked={autoSave}
          onChange={setAutoSave}
          label="Auto Save"
          ariaLabel="Automatically save changes to a draft"
        />
      </Space>

      <Space size="small">
        <Tooltip title={saveTooltip}>
          <Button
            type="primary"
            disabled={saveDisabled}
            loading={saving}
            onClick={handleSaveClick}
          >
            Save
          </Button>
        </Tooltip>
        <Tooltip title="Coming soon">
          <Button disabled>Export</Button>
        </Tooltip>

        {/* Dashboard switcher — list / load wiring arrives in a
            later phase; this still acts as a placeholder so the
            spec stays visible. */}
        <Select
          value="default"
          options={[
            {
              value: 'default',
              label: canvasName ? canvasName : 'Untitled dashboard',
            },
          ]}
          style={{ minWidth: 200 }}
          onChange={() => {}}
          disabled
        />
      </Space>

      <NameSaveModal
        open={namePromptOpen}
        value={pendingName}
        onChange={setPendingName}
        error={nameError}
        loading={saving}
        onCancel={() => {
          setNamePromptOpen(false);
          setNameError(null);
        }}
        onOk={() => {
          const trimmed = pendingName.trim();
          if (!trimmed) {
            setNameError('Name cannot be empty');
            return;
          }
          commitSave(trimmed);
        }}
      />
    </div>
  );
};

/**
 * Modal prompt for naming a new canvas. Surfaces 400 / 409 errors
 * from the backend (illegal name, duplicate) inline below the input
 * so the user can correct without losing the typed name.
 */
const NameSaveModal = ({
  open,
  value,
  onChange,
  error,
  loading,
  onOk,
  onCancel,
}) => (
  <Modal
    open={open}
    title="Save canvas"
    okText="Save"
    cancelText="Cancel"
    confirmLoading={loading}
    onOk={onOk}
    onCancel={onCancel}
    destroyOnClose
  >
    <p style={{ marginTop: 0 }}>Choose a name for this canvas:</p>
    <Input
      autoFocus
      value={value}
      placeholder="e.g. Cumulative Emissions Comparison"
      onChange={(e) => onChange(e.target.value)}
      onPressEnter={onOk}
      status={error ? 'error' : undefined}
    />
    {error && (
      <div style={{ color: '#f04d5b', fontSize: 12, marginTop: 6 }}>
        {error}
      </div>
    )}
  </Modal>
);

// Matches the main viewport's black toolbar height — 24px icon +
// 2×8px icon padding + 2×6px container padding ≈ 52px. Kept at 52
// so the two toolbars read as equal-height siblings if viewed
// side-by-side.
const cardStyle = {
  height: 52,
  boxSizing: 'border-box',
  // 50% opaque white — the grey page shows through at half strength.
  background: 'rgba(255, 255, 255, 0.5)',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

// `height: 32` matches the antd button height so the toggle's
// centerline aligns with `Return` / `Start Over` regardless of the
// Switch's intrinsic height. `marginLeft: 16` doubles the gap
// inherited from `Space size="small"` so the toggle group reads as a
// separate cluster from the navigation buttons.
const syncToggleWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginLeft: 16,
  height: 32,
};

const syncToggleLabelStyle = {
  fontSize: 14,
  color: '#222',
};

// Compact CEA-purple `Switch + label + info` toggle used in the
// Navigator row. Wraps its own `ConfigProvider` so each toggle shows
// up as a distinct child of `Space` and gets the row's flex gap (a
// shared outer provider would collapse them into one slot). The info
// icon's body is loaded by `InfoTooltip` from the backend
// `tooltips.yml` keyed by `tooltipKey`.
const NavigatorToggle = ({
  checked,
  onChange,
  label,
  ariaLabel,
  tooltipKey,
  disabled = false,
}) => (
  <div style={syncToggleWrapperStyle}>
    <ConfigProvider theme={{ token: { colorPrimary: '#AC6080' } }}>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
      />
    </ConfigProvider>
    <span style={syncToggleLabelStyle}>{label}</span>
    {tooltipKey && <InfoTooltip tooltipKey={tooltipKey} />}
  </div>
);

export default NavigatorCard;

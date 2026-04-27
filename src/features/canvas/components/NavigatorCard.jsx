import {
  Button,
  ConfigProvider,
  Modal,
  Select,
  Space,
  Switch,
  Tooltip,
} from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { StartOverIcon } from 'assets/icons';

import InfoTooltip from 'components/InfoTooltip';
import useNavigationStore from 'stores/navigationStore';
import routes from 'constants/routes.json';
import { useCanvasStore } from '../stores/canvasStore';

/**
 * Navigator card — top strip of the Canvas Builder page.
 *
 * Mirrors the main viewport's black toolbar height (≈52px) but uses
 * a white background so it reads as a sibling to the canvas and plot
 * tool cards rather than a toolbar in the traditional sense. Holds
 * navigation actions, view toggles, and the dashboard switcher.
 *
 * Currently visible controls:
 *   - Return       → back to the project page
 *   - Start Over   → clear comparison state (with confirm)
 *   - Sync Maps    → mirror every map card to the overview map
 *   - Fix Layout   → lock card positions and sizes
 *   - Enable Edit  → show editing controls (default on); off
 *                    hides Edit / Delete / `+` / toolbars / range
 *                    inputs for a clean snapshot
 *   - Dashboard    → dropdown to switch between saved dashboards
 *                    (stubbed — backend persistence not wired yet)
 *
 * Placeholder slots (greyed out for now, kept in the UI so the spec
 * is visible while backend support lands):
 *   - Save
 *   - Export
 */
const NavigatorCard = () => {
  const { push } = useNavigationStore();
  const startOver = useCanvasStore((s) => s.startOver);
  const mapsLinked = useCanvasStore((s) => s.mapsLinked);
  const setMapsLinked = useCanvasStore((s) => s.setMapsLinked);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const setEnableEdit = useCanvasStore((s) => s.setEnableEdit);
  const fixLayout = useCanvasStore((s) => s.fixLayout);
  const setFixLayout = useCanvasStore((s) => s.setFixLayout);

  const handleReturn = () => {
    push(routes.PROJECT);
  };

  const handleStartOver = () => {
    Modal.confirm({
      title: 'Start over?',
      content:
        'All cards will be removed and the canvas will return to its launch state.',
      okText: 'Start over',
      cancelText: 'Cancel',
      onOk: startOver,
    });
  };

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
      </Space>

      <Space size="small">
        <Tooltip title="Coming soon">
          <Button disabled>Save</Button>
        </Tooltip>
        <Tooltip title="Coming soon">
          <Button disabled>Export</Button>
        </Tooltip>

        {/* Dashboard switcher — stub. `options` will come from a
            backend-backed dashboards store once persistence lands. */}
        <Select
          value="default"
          options={[{ value: 'default', label: 'Untitled dashboard' }]}
          style={{ minWidth: 200 }}
          onChange={() => {}}
          disabled
        />
      </Space>
    </div>
  );
};

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

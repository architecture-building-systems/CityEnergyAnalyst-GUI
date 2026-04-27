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
import { RefreshIcon } from 'assets/icons';

import useNavigationStore from 'stores/navigationStore';
import routes from 'constants/routes.json';
import { useReportsStore } from '../stores/reportsStore';

/**
 * Navigator card — top strip of the Reports page.
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
 *   - Export View  → hide all editing controls for clean snapshots
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
  const view = useReportsStore((s) => s.view);
  const columns = useReportsStore((s) => s.columns);
  const startOver = useReportsStore((s) => s.startOver);
  const mapsLinked = useReportsStore((s) => s.mapsLinked);
  const setMapsLinked = useReportsStore((s) => s.setMapsLinked);
  const exportMode = useReportsStore((s) => s.exportMode);
  const setExportMode = useReportsStore((s) => s.setExportMode);

  const handleReturn = () => {
    push(routes.PROJECT);
  };

  const handleStartOver = () => {
    if (view !== 'launch' && columns.length > 0) {
      Modal.confirm({
        title: 'Start over?',
        content:
          'This will clear all comparison columns and return to the launch view.',
        okText: 'Start over',
        cancelText: 'Cancel',
        onOk: startOver,
      });
    } else {
      startOver();
    }
  };

  return (
    <div style={cardStyle}>
      <Space size="small" align="center">
        <Button icon={<LeftOutlined />} onClick={handleReturn}>
          Return
        </Button>
        <Button icon={<RefreshIcon />} onClick={handleStartOver}>
          Start Over
        </Button>
        <NavigatorToggle
          checked={mapsLinked}
          onChange={setMapsLinked}
          label="Sync Maps"
          ariaLabel="Sync map cards with overview"
          tooltip={
            mapsLinked
              ? 'Map cards mirror the overview map. Turn off to give each card its own view.'
              : 'Each map card has its own view. Turn on to mirror the overview map.'
          }
        />
        <NavigatorToggle
          checked={exportMode}
          onChange={setExportMode}
          label="Export View"
          ariaLabel="Hide editing controls for export"
          tooltip={
            exportMode
              ? 'Editing controls are hidden. Turn off to show toolbars, edit / delete buttons, and grid drag handles.'
              : 'Hide all editing controls (toolbars, edit / delete buttons, range dropdowns, perimeter `+` buttons) for an export-ready view.'
          }
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

// Compact CEA-purple `Switch + label` toggle used in the Navigator
// row. Wraps its own `ConfigProvider` so each toggle shows up as a
// distinct child of `Space` and gets the row's flex gap (a shared
// outer provider would collapse them into one slot).
const NavigatorToggle = ({ checked, onChange, label, ariaLabel, tooltip }) => (
  <div style={syncToggleWrapperStyle}>
    <ConfigProvider theme={{ token: { colorPrimary: '#AC6080' } }}>
      <Tooltip title={tooltip}>
        <Switch checked={checked} onChange={onChange} aria-label={ariaLabel} />
      </Tooltip>
    </ConfigProvider>
    <span style={syncToggleLabelStyle}>{label}</span>
  </div>
);

export default NavigatorCard;

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
 * navigation actions and the dashboard switcher.
 *
 * Currently visible controls:
 *   - Return       → back to the project page
 *   - Start Over   → clear comparison state (with confirm)
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
        {/* CEA purple (`#AC6080`) for the on-state — matches the
            `editing` stroke and the BottomCard close button so the
            "linked / editing / closing / export" UI reads in one
            family. Each toggle wraps its own ConfigProvider so Space
            sees them as separate flex items and lays them out with
            its own gap (a single shared provider would collapse them
            into one slot). */}
        <div style={syncToggleWrapperStyle}>
          <ConfigProvider theme={{ token: { colorPrimary: '#AC6080' } }}>
            <Tooltip
              title={
                mapsLinked
                  ? 'Map cards mirror the overview map. Turn off to give each card its own view.'
                  : 'Each map card has its own view. Turn on to mirror the overview map.'
              }
            >
              <Switch
                checked={mapsLinked}
                onChange={setMapsLinked}
                aria-label="Sync map cards with overview"
              />
            </Tooltip>
          </ConfigProvider>
          <span style={syncToggleLabelStyle}>Sync Maps</span>
        </div>
        <div style={syncToggleWrapperStyle}>
          <ConfigProvider theme={{ token: { colorPrimary: '#AC6080' } }}>
            <Tooltip
              title={
                exportMode
                  ? 'Editing controls are hidden. Turn off to show toolbars, edit / delete buttons, and grid drag handles.'
                  : 'Hide all editing controls (toolbars, edit / delete buttons, range dropdowns, perimeter `+` buttons) for an export-ready view.'
              }
            >
              <Switch
                checked={exportMode}
                onChange={setExportMode}
                aria-label="Hide editing controls for export"
              />
            </Tooltip>
          </ConfigProvider>
          <span style={syncToggleLabelStyle}>Export View</span>
        </div>
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

// `display: flex` + `alignItems: center` keeps the Switch + label on
// the same horizontal centerline as the antd buttons in the Space
// row. The wrapper is a flex item itself, so cross-axis alignment
// is governed by the Space (which uses `align="center"` above).
// `height: 32` matches the button height so the centerlines coincide
// regardless of the Switch's intrinsic height. The extra `marginLeft`
// doubles the gap inherited from `Space size="small"` so the toggle
// reads as a separate group from Start Over.
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

export default NavigatorCard;

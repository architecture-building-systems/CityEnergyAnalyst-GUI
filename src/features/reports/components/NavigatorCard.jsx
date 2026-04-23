import { Button, Modal, Select, Space, Tooltip } from 'antd';
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
      <Space size="small">
        <Button icon={<LeftOutlined />} onClick={handleReturn}>
          Return
        </Button>
        <Button icon={<RefreshIcon />} onClick={handleStartOver}>
          Start Over
        </Button>
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
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

export default NavigatorCard;

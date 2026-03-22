import { Typography } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useReportsStore } from '../stores/reportsStore';
import TopToolbar from './TopToolbar';

const { Text } = Typography;

/**
 * Reports Mode — root page component.
 * Routes between views based on store state.
 * Components are wired in as they are built.
 */
const ReportsPage = () => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);
  const view = useReportsStore((s) => s.view);

  return (
    <div style={containerStyle}>
      <TopToolbar />
      <div style={placeholderStyle}>
        <Text type="secondary">
          View: {view} | Scenario: {scenario || '—'}
        </Text>
      </div>
    </div>
  );
};

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const placeholderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 48,
  background: '#fff',
  borderRadius: 8,
  border: '1px solid #eee',
};

export default ReportsPage;

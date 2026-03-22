import { useReportsStore } from '../stores/reportsStore';
import TopToolbar from './TopToolbar';
import LaunchView from './LaunchView';
import ComparisonView from './ComparisonView';

/**
 * Reports Mode — root page component.
 * Routes between views based on store state.
 */
const ReportsPage = () => {
  const view = useReportsStore((s) => s.view);

  return (
    <div style={containerStyle}>
      <TopToolbar />
      {view === 'launch' && <LaunchView />}
      {view !== 'launch' && <ComparisonView />}
    </div>
  );
};

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

export default ReportsPage;

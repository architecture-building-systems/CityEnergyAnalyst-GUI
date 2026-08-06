import { useEffect, useState } from 'react';
import { Badge } from 'antd';

import './JobInfoList.css';
import JobInfoCard from './JobInfoCard';
import RecentJobsModal from './RecentJobsModal';
import useJobsStore, { useSortedJobs } from 'features/jobs/stores/jobsStore';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useIsValidUser } from 'stores/useUserQuery';

const useFetchJobs = (project) => {
  const fetchJobs = useJobsStore((state) => state.fetchJobs);
  const isValidUser = useIsValidUser();

  useEffect(() => {
    // Refresh job list when project changes. Only fetch if project is set.
    if (isValidUser && project) fetchJobs();
  }, [project, fetchJobs, isValidUser]);
};

export const JobInfoList = ({ style }) => {
  const project = useProjectStore((state) => state.project);
  useFetchJobs(project);
  const sortedJobs = useSortedJobs();
  const latestJob = sortedJobs[0];
  const [recentJobsOpen, setRecentJobsOpen] = useState(false);

  // Don't render if no project is selected
  if (!project || !latestJob) return null;

  // Other jobs, other than the one being shown
  const activeCount = sortedJobs.filter((job) => job.state <= 1).length;
  const completedCount = sortedJobs.filter((job) => job.state === 2).length;
  const errorCount = sortedJobs.filter((job) => job.state === 3).length;

  const openRecentJobs = () => setRecentJobsOpen(true);

  return (
    <div className="cea-job-info-list" style={style}>
      <JobInfoCard key={latestJob.id} id={latestJob.id} job={latestJob} />

      <div
        className="cea-overlay-card cea-job-info-list-summary"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,

          backgroundColor: '#fff',
          padding: '4px 8px',
        }}
        role="button"
        tabIndex={0}
        title="View recent jobs"
        aria-label="View recent jobs"
        onClick={openRecentJobs}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            openRecentJobs();
            e.preventDefault();
          }
        }}
      >
        <Badge
          className="cea-job-status-badge"
          count={completedCount}
          color="green"
          title={`${completedCount} job${completedCount === 1 ? '' : 's'} completed`}
          size="small"
          showZero
        />
        <Badge
          className="cea-job-status-badge"
          count={activeCount}
          color="blue"
          title={`${activeCount} job${activeCount === 1 ? '' : 's'} in progress`}
          size="small"
          showZero
        />
        <Badge
          className="cea-job-status-badge"
          count={errorCount}
          color="red"
          title={`${errorCount} job${errorCount === 1 ? '' : 's'} failed`}
          size="small"
          showZero
        />
      </div>

      <RecentJobsModal
        open={recentJobsOpen}
        onCancel={() => setRecentJobsOpen(false)}
      />
    </div>
  );
};

export default JobInfoList;

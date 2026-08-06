import { useEffect } from 'react';

import './JobInfoList.css';
import JobInfoCard from './JobInfoCard';
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

  // Don't render if no project is selected
  if (!project || !latestJob) return null;

  return (
    <div className="cea-job-info-list" style={style}>
      <JobInfoCard id={latestJob.id} job={latestJob} />
    </div>
  );
};

export default JobInfoList;

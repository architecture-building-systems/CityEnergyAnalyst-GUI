import { useEffect, useMemo, useRef, useState } from 'react';

import './JobInfoList.css';
import JobInfoCard from './JobInfoCard';
import useJobsStore, { useSortedJobs } from 'features/jobs/stores/jobsStore';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useIsValidUser } from 'stores/userStore';
import { Button } from 'antd';

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
  const hasMore = useJobsStore((state) => state.hasMore);
  const fetchMoreJobs = useJobsStore((state) => state.fetchMoreJobs);

  const [expanded, setExpanded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef(null);

  const jobInfos = useMemo(
    () =>
      sortedJobs.map((job) => {
        return (
          <JobInfoCard key={job.id} id={job.id} job={job} verbose={expanded} />
        );
      }),
    [sortedJobs, expanded],
  );

  const goToBottom = () => {
    if (containerRef.current) {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        container.scrollTop = container.scrollHeight;
      });
    }
  };

  useEffect(() => {
    if (!sortedJobs.length) setExpanded(false);

    // if (containerRef.current && jobLengthRef.current < sortedJobs.length) {
    //   const container = containerRef.current;
    //   // Scroll to bottom when new job is added
    //   container.scrollTo({
    //     top: container.scrollHeight,
    //     behavior: 'smooth',
    //   });
    // }
    // jobLengthRef.current = sortedJobs.length;
  }, [sortedJobs.length]);

  useEffect(() => {
    goToBottom();
  }, [expanded]);

  // Don't render if no project is selected
  if (!project || sortedJobs.length === 0) return null;

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchMoreJobs();
    setLoadingMore(false);
  };

  return (
    <div
      className={`cea-job-info-card-list ${expanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      ref={containerRef}
      style={{
        overflow: expanded ? 'auto' : 'hidden',
        ...style,
      }}
    >
      {jobInfos}
      {expanded && hasMore && (
        <div className="cea-job-load-more">
          <Button
            type="link"
            size="small"
            loading={loadingMore}
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobInfoList;

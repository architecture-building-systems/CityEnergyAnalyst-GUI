import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Segmented } from 'antd';

import './RecentJobsModal.css';
import JobInfoCard from './JobInfoCard';
import useJobsStore, { useSortedJobs } from 'features/jobs/stores/jobsStore';

// Mirrors the predicates used for the badge counts in JobInfoList.
const FILTERS = {
  all: () => true,
  active: (job) => job.state <= 1,
  completed: (job) => job.state === 2,
  error: (job) => job.state === 3,
};

const RecentJobsModal = ({ open, onCancel }) => {
  const [filter, setFilter] = useState('all');
  const [loadingMore, setLoadingMore] = useState(false);

  const sortedJobs = useSortedJobs();
  const hasMore = useJobsStore((state) => state.hasMore);
  const fetchMoreJobs = useJobsStore((state) => state.fetchMoreJobs);

  const filteredJobs = useMemo(
    () => sortedJobs.filter(FILTERS[filter]),
    [sortedJobs, filter],
  );

  const options = useMemo(
    () => [
      { label: `All (${sortedJobs.length})`, value: 'all' },
      {
        label: `In progress (${sortedJobs.filter(FILTERS.active).length})`,
        value: 'active',
      },
      {
        label: `Completed (${sortedJobs.filter(FILTERS.completed).length})`,
        value: 'completed',
      },
      {
        label: `Failed (${sortedJobs.filter(FILTERS.error).length})`,
        value: 'error',
      },
    ],
    [sortedJobs],
  );

  // Reset local UI state each time the modal is (re)opened -- destroyOnHidden
  // unmounts everything on close, so this is mostly a no-op on the very next
  // open, but keeps behaviour correct if that ever changes.
  useEffect(() => {
    if (open) setFilter('all');
  }, [open]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchMoreJobs().finally(() => setLoadingMore(false));
  };

  return (
    <Modal
      title="Recent jobs"
      open={open}
      onCancel={onCancel}
      width={600}
      footer={false}
      destroyOnHidden
    >
      <Segmented
        value={filter}
        onChange={setFilter}
        options={options}
        block
        style={{ marginBottom: 12 }}
      />

      <div className="cea-recent-jobs-scroll">
        {filteredJobs.map((job) => (
          <JobInfoCard key={job.id} id={job.id} job={job} />
        ))}

        {filteredJobs.length === 0 && !hasMore && (
          <div className="cea-recent-jobs-end">No jobs found</div>
        )}
      </div>

      {hasMore && (
        <div className="cea-recent-jobs-load-more">
          <Button loading={loadingMore} onClick={handleLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default RecentJobsModal;

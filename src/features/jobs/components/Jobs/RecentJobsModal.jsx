import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  message,
} from 'antd';

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

// Mirrors JobActions' showDelete condition in JobInfoCard -- pending/running
// jobs (state <= 1) can't be deleted, so they're excluded from selection.
const isDeletable = (job) => job.state > 1;

const RecentJobsModal = ({ open, onCancel }) => {
  const [filter, setFilter] = useState('all');
  const [scenarioFilter, setScenarioFilter] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);

  const sortedJobs = useSortedJobs();
  const hasMore = useJobsStore((state) => state.hasMore);
  const fetchMoreJobs = useJobsStore((state) => state.fetchMoreJobs);
  const deleteJobs = useJobsStore((state) => state.deleteJobs);

  const scenarioOptions = useMemo(() => {
    const names = new Set(
      sortedJobs.map((job) => job.scenario_name).filter(Boolean),
    );
    return [...names].sort().map((name) => ({ label: name, value: name }));
  }, [sortedJobs]);

  const filteredJobs = useMemo(
    () =>
      sortedJobs
        .filter(FILTERS[filter])
        .filter((job) => !scenarioFilter || job.scenario_name === scenarioFilter),
    [sortedJobs, filter, scenarioFilter],
  );

  const selectableFilteredJobs = useMemo(
    () => filteredJobs.filter(isDeletable),
    [filteredJobs],
  );
  const allSelected =
    selectableFilteredJobs.length > 0 &&
    selectableFilteredJobs.every((job) => selectedIds.has(job.id));
  const someSelected = selectableFilteredJobs.some((job) =>
    selectedIds.has(job.id),
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
    if (open) {
      setFilter('all');
      setScenarioFilter(null);
      setSelecting(false);
      setSelectedIds(new Set());
    }
  }, [open]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchMoreJobs().finally(() => setLoadingMore(false));
  };

  const handleSelectAllChange = (e) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      selectableFilteredJobs.forEach((job) => {
        if (e.target.checked) {
          next.add(job.id);
        } else {
          next.delete(job.id);
        }
      });
      return next;
    });
  };

  const toggleJobSelected = (jobId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleCancelSelecting = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    setDeleting(true);
    try {
      const { succeededIds, failed } = await deleteJobs(ids);
      if (failed.length === 0) {
        message.success(
          `Deleted ${succeededIds.length} job${succeededIds.length === 1 ? '' : 's'}`,
        );
      } else if (succeededIds.length === 0) {
        message.error(
          `Failed to delete ${failed.length} job${failed.length === 1 ? '' : 's'}`,
        );
      } else {
        message.warning(
          `Deleted ${succeededIds.length} job${succeededIds.length === 1 ? '' : 's'}, failed to delete ${failed.length}`,
        );
      }
      setSelecting(false);
      setSelectedIds(new Set());
    } finally {
      setDeleting(false);
    }
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
        style={{ marginBottom: 8 }}
      />

      <Select
        value={scenarioFilter}
        onChange={setScenarioFilter}
        options={scenarioOptions}
        placeholder="Filter by scenario"
        allowClear
        showSearch
        style={{ width: '100%', marginBottom: 12 }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          minHeight: 24,
        }}
      >
        {selecting ? (
          <>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={handleSelectAllChange}
              disabled={selectableFilteredJobs.length === 0}
            >
              Select all
            </Checkbox>
            <span
              style={{ flex: 1, fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}
            >
              {selectedIds.size} selected
            </span>
            <Popconfirm
              title={`Delete ${selectedIds.size} job${selectedIds.size === 1 ? '' : 's'}?`}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true, loading: deleting }}
              onConfirm={handleBulkDelete}
              disabled={selectedIds.size === 0}
            >
              <Button size="small" danger disabled={selectedIds.size === 0}>
                Delete
              </Button>
            </Popconfirm>
            <Button size="small" onClick={handleCancelSelecting}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="small"
            style={{ marginLeft: 'auto' }}
            onClick={() => setSelecting(true)}
            disabled={filteredJobs.length === 0}
          >
            Select
          </Button>
        )}
      </div>

      <div className="cea-recent-jobs-scroll">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {selecting && (
              <Checkbox
                checked={selectedIds.has(job.id)}
                disabled={!isDeletable(job)}
                onChange={() => toggleJobSelected(job.id)}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <JobInfoCard id={job.id} job={job} />
            </div>
          </div>
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

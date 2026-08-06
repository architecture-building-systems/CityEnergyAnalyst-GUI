import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleFilled,
  LoadingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

import { parseISO, formatDistanceToNowStrict } from 'date-fns';
import { BinAnimationIcon, StopIcon } from 'assets/icons';
import { useEffect, useState } from 'react';
import useJobsStore from 'features/jobs/stores/jobsStore';

import './JobInfoCard.css';
import JobInfoModal from './JobInfoModal';

// Short unit suffixes for date-fns' own distance tokens, e.g. "5s ago", "12m ago", "3h ago"
const SHORT_DISTANCE_UNITS = {
  xSeconds: 's',
  xMinutes: 'm',
  xHours: 'h',
  xDays: 'd',
  xWeeks: 'w',
  xMonths: 'mo',
  xYears: 'y',
};

const shortDistanceLocale = {
  formatDistance: (token, count, options) => {
    const result = `${count}${SHORT_DISTANCE_UNITS[token] ?? ''}`;
    return options?.addSuffix ? `${result} ago` : result;
  },
};

const formatTimeAgo = (date, short = false) =>
  date
    ? formatDistanceToNowStrict(date, {
        addSuffix: true,
        ...(short && { locale: shortDistanceLocale }),
      })
    : '-';

const useRefreshInterval = () => {
  const [refreshInterval, setRefreshInterval] = useState(30 * 1000); // Start with 30s

  // Set up exponential interval for refreshing the component
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Increase the interval exponentially
      setRefreshInterval((prevInterval) =>
        Math.min(prevInterval * 2, 30 * 60 * 1000),
      );
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]); // Recreate the interval when refreshInterval changes
};

const JobActions = ({ id, job, showDelete }) => {
  const [isLoading, setIsLoading] = useState(false);

  const { deleteJob, cancelJob } = useJobsStore();

  // Add this function to prevent event propagation
  const stopPropagation = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleDelete = async (e) => {
    stopPropagation(e);
    setIsLoading(true);
    try {
      await deleteJob(id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (e) => {
    stopPropagation(e);
    setIsLoading(true);
    try {
      await cancelJob(id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="cea-job-info-content-actions"
      style={{
        fontSize: 18,
      }}
    >
      {isLoading ? (
        <LoadingOutlined style={{ color: 'grey', padding: 8 }} spin />
      ) : job.state > 1 ? (
        showDelete && (
          <button
            type="button"
            className="cea-job-info-action-button"
            aria-label="Delete job"
            onClick={handleDelete}
          >
            <BinAnimationIcon className="cea-job-info-icon danger shake" />
          </button>
        )
      ) : (
        job.state < 2 && (
          <button
            type="button"
            className="cea-job-info-action-button"
            aria-label="Cancel job"
            onClick={handleCancel}
          >
            <StopIcon className="cea-job-info-icon danger" />
          </button>
        )
      )}
    </div>
  );
};

export const JobStartedAgo = ({ startTime, short = false }) => {
  // ASSUMPTION: start_time is in UTC
  const start_time = startTime
    ? typeof startTime === 'string'
      ? parseISO(startTime.includes('Z') ? startTime : startTime + 'Z')
      : new Date(startTime)
    : null;

  return (
    <span className="cea-job-started-ago" title={start_time?.toLocaleString()}>
      {formatTimeAgo(start_time, short)}
    </span>
  );
};

const JobInfoCard = ({ id, job }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  useRefreshInterval();

  const duration = job?.duration
    ? Math.round((job?.duration / 60) * 10) / 10
    : '-';

  const StateIcon = ({ state }) => {
    switch (state) {
      case 0:
        return <ClockCircleOutlined style={{ color: 'blue' }} />;
      case 1:
        return <LoadingOutlined style={{ color: 'blue' }} />;
      case 2:
        return <CheckCircleFilled style={{ color: 'green' }} />;
      case 3:
        return <ExclamationCircleFilled style={{ color: 'red' }} />;
      case 4:
        return <CloseCircleOutlined style={{ color: 'grey' }} />;
      default:
        return <QuestionCircleOutlined style={{ color: 'grey' }} />;
    }
  };

  const handleClick = () => {
    setModalVisible(true);
  };

  return (
    <>
      <div
        className="cea-job-info-card"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="cea-job-info-card-trigger"
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleClick();
              e.preventDefault();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Job: ${job?.script_label ?? job?.script}`}
        >
          <div
            className="cea-status-bar-icon"
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 16,
              margin: 6,
            }}
          >
            <StateIcon state={job.state} />
          </div>

          <div className="cea-job-info-content">
            <div
              className="cea-job-info-content-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
              }}
            >
              <div className="cea-job-info-content-title-group">
                <div className="cea-job-info-content-title">
                  {job?.script_label ?? job?.script}
                </div>
                <div className="cea-job-info-id" title={job?.id}>
                  {job?.id?.slice(0, 8)}
                </div>
              </div>
              <JobStartedAgo startTime={job?.start_time} short />
            </div>

            <div className="cea-job-info-content-details">
              scenario: <b>{job?.scenario_name}</b>{' '}
              {typeof duration === 'number' && (
                <span className="cea-job-duration">
                  [{duration >= 1 ? `${duration} minutes` : '< 1 minute'}]
                </span>
              )}
            </div>
          </div>
        </div>

        <JobActions id={id} job={job} showDelete={isHovered} />
      </div>
      <JobInfoModal
        job={{ id, ...job }}
        visible={modalVisible}
        setVisible={setModalVisible}
      />
    </>
  );
};

export default JobInfoCard;

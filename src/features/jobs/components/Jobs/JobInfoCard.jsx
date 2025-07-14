import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

import { parseISO, formatDistanceToNow } from 'date-fns';
import { BinAnimationIcon, InformationIcon, StopIcon } from 'assets/icons';
import { useEffect, useState } from 'react';
import useJobsStore from 'features/jobs/stores/jobsStore';

import './JobInfoCard.css';
import { apiClient } from 'lib/api/axios';

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

const JobInfoCard = ({ id, job, setModalVisible, setSelectedJob, verbose }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteJob } = useJobsStore();
  useRefreshInterval();

  const duration = job?.duration
    ? Math.round((job?.duration / 60) * 10) / 10
    : '-';

  // ASSUMPTION: start_time is in UTC
  const start_time = job?.start_time
    ? typeof job.start_time === 'string'
      ? parseISO(
          job.start_time.includes('Z') ? job.start_time : job.start_time + 'Z',
        ) // Ensure UTC interpretation by adding Z
      : new Date(job.start_time)
    : null;
  const started_ago = start_time
    ? formatDistanceToNow(start_time, {
        addSuffix: true,
        includeSeconds: true,
      })
    : '-';

  const StateIcon = ({ state }) => {
    switch (state) {
      case 0:
        return <ClockCircleOutlined style={{ color: 'blue' }} />;
      case 1:
        return <LoadingOutlined style={{ color: 'blue' }} />;
      case 2:
        return <CheckCircleOutlined style={{ color: 'green' }} />;
      case 3:
        return <ExclamationCircleOutlined style={{ color: 'red' }} />;
      case 4:
        return <CloseCircleOutlined style={{ color: 'grey' }} />;
      default:
        return null;
    }
  };

  const handleClick = () => {
    setSelectedJob({ id, ...job });
    setModalVisible(true);
  };

  // Add this function to prevent event propagation
  const stopPropagation = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      className="cea-job-info-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

      <div
        className="cea-job-info-content"
        style={{
          flexGrow: 1,
          padding: 4,

          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,

          fontSize: 12,
        }}
      >
        <div className="cea-job-info-content-left">
          <div>
            <b>{job?.script_label ?? job?.script}</b>
          </div>
          <div>
            scenario: <b>{job?.scenario_name} </b>
            {!verbose && start_time && <span>[started {started_ago}]</span>}
          </div>

          {verbose && (
            <div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div>
                  started:{' '}
                  <i title={start_time ? start_time.toLocaleString() : ''}>
                    {started_ago}
                  </i>
                </div>
                <div>
                  duration:{' '}
                  <i>
                    {typeof duration == 'number'
                      ? duration >= 1
                        ? duration + ' minutes'
                        : '< 1 minute'
                      : duration}
                  </i>
                </div>
              </div>
            </div>
          )}
        </div>
        <div
          className="cea-job-info-content-actions"
          style={{
            fontSize: 18,
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
          }}
        >
          {verbose && isHovered && (
            <InformationIcon
              className="cea-job-info-icon info"
              onClick={(e) => {
                stopPropagation(e);
                handleClick();
              }}
            />
          )}
          {job.state > 1 && isHovered && (
            <BinAnimationIcon
              className="cea-job-info-icon danger shake"
              onClick={(e) => {
                stopPropagation(e);
                deleteJob(id);
              }}
            />
          )}
          {job.state < 2 && (
            <StopIcon
              className="cea-job-info-icon danger"
              onClick={(e) => {
                stopPropagation(e);
                cancelCeaJob({ id, ...job });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const cancelCeaJob = (job) => {
  apiClient.post(`/server/jobs/cancel/${job.id}`);
};

export default JobInfoCard;

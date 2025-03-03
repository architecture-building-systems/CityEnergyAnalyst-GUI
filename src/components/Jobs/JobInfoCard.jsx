import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

import axios from 'axios';
import { parseISO, formatDistanceToNow } from 'date-fns';
import {
  BinAnimationIcon,
  InformationIcon,
  StopIcon,
} from '../../assets/icons';
import { useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { deleteJob } from '../../actions/jobs';

import './JobInfoCard.css';

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
  const dispatch = useDispatch();
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
  return (
    <div
      className="cea-job-info-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        }}
      >
        <div className="cea-job-info-content-left">
          <div>
            <b>{job?.script_label ?? job?.script}</b>
          </div>
          <small>
            scenario: <b>{job?.scenario_name} </b>
          </small>

          <div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <small>
                started:{' '}
                <i title={start_time ? start_time.toLocaleString() : ''}>
                  {start_time
                    ? formatDistanceToNow(start_time, {
                        addSuffix: true,
                        includeSeconds: true,
                      })
                    : '-'}
                </i>
              </small>
              {verbose && (
                <small>
                  duration:{' '}
                  <i>
                    {typeof duration == 'number'
                      ? duration >= 1
                        ? duration + ' minutes'
                        : '< 1 minute'
                      : duration}
                  </i>
                </small>
              )}
            </div>
          </div>
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
          {job.state > 1 && isHovered && (
            <BinAnimationIcon
              className="cea-job-info-icon danger shake"
              onClick={() => dispatch(deleteJob(id))}
            />
          )}
          {job.state < 2 && (
            <StopIcon
              className="cea-job-info-icon danger"
              onClick={() => cancelCeaJob({ id, ...job })}
            />
          )}
          <InformationIcon
            className="cea-job-info-icon info"
            onClick={() => {
              setSelectedJob({ id, ...job });
              setModalVisible(true);
            }}
          />
        </div>
      </div>
    </div>
  );
};

const cancelCeaJob = (job) => {
  axios.post(`${import.meta.env.VITE_CEA_URL}/server/jobs/cancel/${job.id}`);
};

export default JobInfoCard;

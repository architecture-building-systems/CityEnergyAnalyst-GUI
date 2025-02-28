import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

import { Button, Modal } from 'antd';
import io from 'socket.io-client';
import axios from 'axios';
import { fetchJobs, updateJob, dismissJob } from '../../../actions/jobs';
import './StatusBar.css';
import { useProjectStore } from '../../Project/store';

import { parseISO, formatDistanceToNow } from 'date-fns';

const socket = io(`${import.meta.env.VITE_CEA_URL}`);

const StatusBar = () => {
  return (
    <div id="cea-status-bar-container">
      <div id="cea-status-bar-left">
        <CEAVersion />
      </div>
      <div id="cea-status-bar-right">
        <JobStatusBar />
      </div>
    </div>
  );
};

const CEAVersion = () => {
  const [version, setVersion] = useState();
  const getVersion = async () => {
    try {
      const _version = await window?.api?.getAppVersion();
      if (_version === undefined)
        throw new Error('Unable to determine CEA version.');

      setVersion(`v${_version}`);
    } catch (e) {
      setVersion('');
    }
  };

  useEffect(() => {
    getVersion();
  }, []);

  return (
    <div
      style={{
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        margin: '0 12px',
        fontWeight: 'bold',
        userSelect: 'none',
      }}
    >
      <span>{version}</span>
    </div>
  );
};

const JobOutputLogger = () => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    socket.on('cea-worker-message', (data) => {
      let lines = data.message
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
      let last_line = lines[lines.length - 1];
      last_line &&
        setMessage(`jobID: ${data.jobid} - ${last_line.substr(0, 80)}`);
    });

    socket.on('cea-worker-success', (job_info) => {
      setMessage(`jobID: ${job_info.id} - completed`);
    });

    socket.on('cea-worker-error', (job_info) => {
      console.log('cea-worker-error: job_info:', job_info);
      setMessage(`jobID: ${job_info.id} - error`);
    });

    socket.on('cea-worker-canceled', (job_info) => {
      console.log('cea-worker-canceled: job_info', job_info);
      setMessage(`jobID: ${job_info.id} - canceled`);
    });

    return () => {
      socket.off('cea-worker-message');
      socket.off('cea-worker-success');
      socket.off('cea-worker-error');
      socket.off('cea-worker-canceled');
    };
  }, []);

  if (message.length < 1) return null;

  return <span>{message}</span>;
};

const JobStatusBar = () => {
  const jobs = useSelector((state) => state.jobs);
  const dispatch = useDispatch();

  const project = useProjectStore((state) => state.project);

  useEffect(() => {
    socket.on('cea-job-created', (job) => {
      console.log('cea-job-created: job', job);
    });
    socket.on('cea-worker-started', (job) => {
      dispatch(updateJob(job));
    });
    socket.on('cea-worker-success', (job) => {
      dispatch(updateJob(job));
    });
    socket.on('cea-worker-canceled', (job) => {
      dispatch(dismissJob(job));
    });
    socket.on('cea-worker-error', (job) => {
      dispatch(updateJob(job));
    });

    return () => {
      socket.off('cea-job-created');
      socket.off('cea-worker-started');
      socket.off('cea-worker-success');
      socket.off('cea-worker-canceled');
      socket.off('cea-worker-error');
    };
  }, []);

  useEffect(() => {
    // Refresh job list when project changes
    dispatch(fetchJobs());
  }, [project]);

  return jobs ? (
    <div className="cea-status-bar-button">
      <JobOutputLogger />
      {/* <ToolFilled className="cea-job-list-popover-collapse" /> */}
    </div>
  ) : null;
};

export const JobListPopoverContent = () => {
  const jobs = useSelector((state) => state.jobs);

  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const jobArray = Object.keys(jobs);
  const containerRef = useRef(null);

  // Scroll to top when jobs array changes
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      // Scroll to bottom when new job is added
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [jobArray.length]);

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        overflow: 'auto',
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {jobArray.reverse().map((_, index) => {
        const id = jobArray[jobArray.length - 1 - index];
        return (
          <JobInfoCard
            key={id}
            id={id}
            job={jobs[id]}
            setModalVisible={setModalVisible}
            setSelectedJob={setSelectedJob}
          />
        );
      })}
      {selectedJob && (
        <JobOutputModal
          job={selectedJob}
          visible={modalVisible}
          setVisible={setModalVisible}
        />
      )}
    </div>
  );
};

const JobInfoCard = ({ id, job, setModalVisible, setSelectedJob }) => {
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
    <div className="cea-job-info-card">
      <div
        id="cea-status-bar-icon"
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
        id="cea-status-bar-content"
        style={{
          flexGrow: 1,
          padding: 4,

          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div id="cea-status-bar-content-left">
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
            </div>
          </div>
        </div>
        <div id="cea-status-bar-content-buttons">
          {job.state < 2 && (
            <Button
              size="small"
              danger
              onClick={() => cancelCeaJob({ id, ...job })}
            >
              Cancel
            </Button>
          )}
          <Button
            size="small"
            onClick={() => {
              setSelectedJob({ id, ...job });
              setModalVisible(true);
            }}
          >
            More Info
          </Button>
        </div>
      </div>
    </div>
  );
};

const JobOutputModal = ({ job, visible, setVisible }) => {
  const [message, setMessage] = useState('');
  const isFirst = useRef(true);
  const listenerFuncRef = useRef(null);

  const message_appender = (data) => {
    if (data.jobid == job.id) {
      setMessage((message) => message.concat(data.message));
    }
  };

  useEffect(() => {
    const getJobOutput = async () => {
      try {
        const resp = await axios.get(
          `${import.meta.env.VITE_CEA_URL}/server/streams/read/${job.id}`,
          null,
          { responseType: 'text' },
        );
        setMessage(resp.data);
      } catch (error) {
        console.error(error);
      }
    };
    listenerFuncRef.current &&
      socket.removeEventListener('cea-worker-message', listenerFuncRef.current);
    isFirst.current = true;
    getJobOutput();
  }, [job]);

  useEffect(() => {
    if (isFirst.current) {
      listenerFuncRef.current = message_appender;
      socket.on('cea-worker-message', message_appender);
      isFirst.current = false;
    }
  }, [message]);

  return (
    <Modal
      title={`Job Output for ${job.id} - ${job.script}`}
      open={visible}
      width={800}
      footer={false}
      onCancel={() => setVisible(false)}
      destroyOnClose
    >
      <div style={{ height: '35vh' }}>
        <pre
          style={{
            height: '90%',
            overflow: 'auto',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </pre>
      </div>
    </Modal>
  );
};

const cancelCeaJob = (job) => {
  axios.post(`${import.meta.env.VITE_CEA_URL}/server/jobs/cancel/${job.id}`);
};

export default StatusBar;

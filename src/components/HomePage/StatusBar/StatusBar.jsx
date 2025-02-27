import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  ToolFilled,
} from '@ant-design/icons';

import { notification, Button, Modal, Space } from 'antd';
import io from 'socket.io-client';
import axios from 'axios';
import { fetchJobs, updateJob, dismissJob } from '../../../actions/jobs';
import './StatusBar.css';
import { useProjectStore } from '../../Project/store';

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

  const openNotification = (type, { id, script }) => {
    const title = <i>{`jobID: ${id} - ${script}`}</i>;
    const message = {
      created: (
        <div>
          {title} has been <b>created</b>
        </div>
      ),
      started: (
        <div>
          {title} has <b>started</b>
        </div>
      ),
      success: (
        <div>
          {title} has <b>completed</b>
        </div>
      ),
      canceled: (
        <div>
          {title} was <b>canceled</b> by user
        </div>
      ),
      error: <div>{title} has encounted an error</div>,
    };

    const config = {
      key: id,
      message: message[type],
      placement: 'bottomRight',
    };
    if (type === 'started')
      notification.open({ ...config, icon: <LoadingOutlined /> });
    else if (type === 'created') notification['info'](config);
    else if (type === 'canceled') notification['info'](config);
    else {
      notification[type](config);
    }
  };

  useEffect(() => {
    socket.on('cea-job-created', (job) => {
      openNotification('created', job);
    });
    socket.on('cea-worker-started', (job) => {
      openNotification('started', job);
      dispatch(updateJob(job));
    });
    socket.on('cea-worker-success', (job) => {
      openNotification('success', job);
      dispatch(updateJob(job));
    });
    socket.on('cea-worker-canceled', (job) => {
      openNotification('canceled', job);
      dispatch(dismissJob(job));
    });
    socket.on('cea-worker-error', (job) => {
      openNotification('error', job);
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
      <ToolFilled className="cea-job-list-popover-collapse" />
    </div>
  ) : null;
};

const JobListPopoverTitle = ({ jobs, setVisible }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div>
        {!Object.keys(jobs).length ? 'No Jobs Running' : 'Current Jobs'}
      </div>
      <DownOutlined
        style={{ fontSize: 10, alignSelf: 'center' }}
        onClick={() => setVisible(false)}
      />
    </div>
  );
};

export const JobListPopoverContent = () => {
  const jobs = useSelector((state) => state.jobs);

  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const jobArray = Object.keys(jobs);

  return (
    <div
      style={{
        width: '100%',
        maxHeight: 200,
        overflow: 'auto',
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {jobArray.map((_, index) => {
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
          <div style={{ fontWeight: 'bold' }}>{`${job.script} `}</div>
          <small>scenario: {job.parameters?.scenario}</small>

          <div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <small>
                started: <i>{job.start_time}</i>
              </small>
              <i></i>
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

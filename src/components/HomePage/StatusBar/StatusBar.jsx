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

import { Popover, notification, Button, Modal } from 'antd';
import io from 'socket.io-client';
import axios from 'axios';
import { fetchJobs, updateJob, dismissJob } from '../../../actions/jobs';
import './StatusBar.css';

const socket = io(`${import.meta.env.VITE_CEA_URL}`);

const StatusBar = () => {
  return (
    <div id="cea-status-bar-container">
      <div id="cea-status-bar-left"></div>
      <div id="cea-status-bar-right">
        <JobListPopover />
      </div>
    </div>
  );
};

const StatusBarButton = ({ children, ...props }) => {
  return (
    <div {...props} className="cea-status-bar-button">
      {children}
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
  }, []);

  if (message.length < 1) return null;

  return (
    <>
      <span style={{ margin: '0 5px' }}>{message}</span>
    </>
  );
};

const JobListPopover = () => {
  const [visible, setVisible] = useState(false);
  const jobs = useSelector((state) => state.jobs);
  const dispatch = useDispatch();

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
      onClick: () => {
        notification.close(id);
        setVisible(true);
      },
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
  }, []);

  useEffect(() => {
    dispatch(fetchJobs());
  }, []);

  return jobs ? (
    <Popover
      overlayClassName="cea-job-list-popover"
      placement="topRight"
      title={<JobListPopoverTitle jobs={jobs} setVisible={setVisible} />}
      content={<JobListPopoverContent jobs={jobs} />}
      visible={visible}
    >
      <StatusBarButton onClick={() => setVisible((visible) => !visible)}>
        <JobOutputLogger />
        <ToolFilled className="cea-job-list-popover-collapse" />
      </StatusBarButton>
    </Popover>
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

const JobListPopoverContent = ({ jobs }) => {
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const jobArray = Object.keys(jobs);

  return (
    <div style={{ maxHeight: 350 }}>
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
  const JOB_STATES = ['Pending', 'Running...', 'Success', 'ERROR', 'Canceled'];

  const StateIcon = ({ state }) => {
    switch (state) {
      case 0:
        return <ClockCircleOutlined style={{ color: 'blue', margin: 5 }} />;
      case 1:
        return <LoadingOutlined style={{ color: 'blue', margin: 5 }} />;
      case 2:
        return <CheckCircleOutlined style={{ color: 'green', margin: 5 }} />;
      case 3:
        return (
          <ExclamationCircleOutlined style={{ color: 'red', margin: 5 }} />
        );
      case 4:
        return <CloseCircleOutlined style={{ color: 'grey', margin: 5 }} />;
      default:
        return null;
    }
  };
  return (
    <div className="cea-job-info-card">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <StateIcon state={job.state} />
          <b>{`jobID: ${id} - ${job.script}`}</b>
        </div>
        <div>
          {job.state < 2 && (
            <Button size="small" onClick={() => cancelCeaJob({ id, ...job })}>
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
      <div>
        <div>
          <small>status:</small>
          <i>{` ${JOB_STATES[job.state]}`}</i>
        </div>
        <div>
          <small>parameters: </small>
        </div>
        <pre
          style={{
            padding: 5,
            fontSize: 11,
            backgroundColor: '#f1f1f1',
          }}
        >
          {JSON.stringify(job.parameters, null, 2)}
        </pre>
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
          { responseType: 'text' }
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
      visible={visible}
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

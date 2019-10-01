import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Icon, Popover, notification, Button, Modal } from 'antd';
import io from 'socket.io-client';
import axios from 'axios';
import { fetchJobs, updateJob } from '../../actions/jobs';
import './StatusBar.css';

const socket = io('http://localhost:5050');

const StatusBar = () => {
  return (
    <div id="cea-status-bar-container">
      <div id="cea-status-bar-left">
        <EventLogger />
      </div>
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

const EventLogger = () => {
  const [message, setMessage] = useState('Nothing happening...');

  useEffect(() => {
    socket.on('cea-worker-message', data => {
      let lines = data.message
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(x => x.length > 0);
      let last_line = lines[lines.length - 1];
      last_line &&
        setMessage(`jobID: ${data.jobid} - ${last_line.substr(0, 80)}`);
    });

    socket.on('cea-worker-success', job_info => {
      setMessage(`jobID: ${job_info.id} - completed`);
    });

    socket.on('cea-worker-error', job_info => {
      console.log('cea-worker-error: job_info:', job_info);
      setMessage(`jobID: ${job_info.id} - error`);
    });
  }, []);

  return (
    <StatusBarButton>
      <div>{message}</div>
    </StatusBarButton>
  );
};

const JobListPopover = () => {
  const [visible, setVisible] = useState(false);
  const jobs = useSelector(state => state.jobs);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchJobs());
  }, []);

  return jobs ? (
    <Popover
      overlayClassName="cea-job-list-popover"
      placement="topRight"
      title={<JobListPopoverTitle jobs={jobs} setVisible={setVisible} />}
      content={<JobListPopoverContent jobs={jobs} setVisible={setVisible} />}
      visible={visible}
    >
      <StatusBarButton onClick={() => setVisible(visible => !visible)}>
        <Icon
          className="cea-job-list-popover-collapse"
          type="tool"
          theme="filled"
        />
        <span style={{ marginLeft: 5 }}>{Object.keys(jobs).length}</span>
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
      <Icon
        type="down"
        style={{ fontSize: 10, alignSelf: 'center' }}
        onClick={() => setVisible(false)}
      />
    </div>
  );
};

const JobListPopoverContent = ({ jobs, setVisible }) => {
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const jobArray = Object.keys(jobs);

  const dispatch = useDispatch();
  const openNotification = (type, { id, script }) => {
    const title = <i>{`jobID: ${id} - ${script}`}</i>;
    const message = {
      created: (
        <div>
          {title} has been <b>created</b>
        </div>
      ),
      info: (
        <div>
          {title} has <b>started</b>
        </div>
      ),
      success: (
        <div>
          {title} has <b>completed</b>
        </div>
      ),
      error: <div>{title} has encounted an error</div>
    };
    notification[type !== 'created' ? type : 'info']({
      key: id,
      message: message[type],
      top: 64
    });
  };

  useEffect(() => {
    socket.on('cea-job-created', job => {
      openNotification('created', job);
    });
    socket.on('cea-worker-started', job => {
      openNotification('info', job);
      dispatch(updateJob(job));
    });
    socket.on('cea-worker-success', job => {
      openNotification('success', job);
      dispatch(updateJob(job));
    });
    socket.on('cea-worker-error', job => {
      openNotification('error', job);
      dispatch(updateJob(job));
    });
  }, []);

  return (
    <div style={{ maxHeight: 350 }}>
      {jobArray.map((_, index) => {
        const id = jobArray[jobArray.length - 1 - index];
        return (
          <JobInfoCard
            key={id}
            id={id}
            job={jobs[id]}
            setPopoverVisible={setVisible}
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

const JobInfoCard = ({
  id,
  job,
  setPopoverVisible,
  setModalVisible,
  setSelectedJob
}) => {
  const JOB_STATES = ['Pending', 'Running...', 'Success', 'ERROR'];

  const StateIcon = ({ state }) => {
    switch (state) {
      case 0:
        return (
          <Icon type="clock-circle" style={{ color: 'blue', margin: 5 }} />
        );
      case 1:
        return <Icon type="loading" style={{ color: 'blue', margin: 5 }} />;
      case 2:
        return (
          <Icon type="check-circle" style={{ color: 'green', margin: 5 }} />
        );
      case 3:
        return (
          <Icon type="exclamation-circle" style={{ color: 'red', margin: 5 }} />
        );
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
            backgroundColor: '#f1f1f1'
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

  const message_appender = data => {
    if (data.jobid == job.id) {
      setMessage(message => message.concat(data.message));
    }
  };

  useEffect(() => {
    const getJobOutput = async () => {
      try {
        const resp = await axios.get(
          `http://localhost:5050/server/streams/read/${job.id}`,
          null,
          { responseType: 'text' }
        );
        setMessage(resp.data);
      } catch (error) {
        console.log(error);
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
            whiteSpace: 'pre-wrap'
          }}
        >
          {message}
        </pre>
      </div>
    </Modal>
  );
};

export default StatusBar;

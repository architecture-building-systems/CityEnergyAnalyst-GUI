import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ipcRenderer } from 'electron';
import { Icon, Popover, notification, Button } from 'antd';
import io from 'socket.io-client';
import { updateJob } from '../../actions/jobs';
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

      setMessage(`jobID: ${data.jobid} - ${last_line.substr(0, 80)}`);
    });

    socket.on('cea-worker-success', job_info => {
      setMessage(`jobID: ${job_info.id} - completed`);
    });

    socket.on('cea-worker-error', job_info => {
      console.log('cea-worker-error: job_info:', job_info);
      setMessage(`jobID: ${job_info.id} - error`);
    });
  });

  return (
    <StatusBarButton>
      <div>{message}</div>
    </StatusBarButton>
  );
};

const JobListPopover = () => {
  const [visible, setVisible] = useState(false);
  const jobs = useSelector(state => state.jobs);
  const jobsLength = Object.keys(jobs).length;

  const dispatch = useDispatch();
  const openNotification = (type, { id, script }) => {
    const title = `jobID: ${id} - ${script}`;
    const message = {
      success: `${title} has completed`,
      info: `${title} has started`,
      warning: `${title}`,
      error: `${title} has encounted an error`
    };
    notification[type]({
      key: id,
      message: message[type],
      top: 64
    });
  };

  useEffect(() => {
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
        <span style={{ marginLeft: 5 }}>{jobsLength}</span>
      </StatusBarButton>
    </Popover>
  );
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
  const jobArray = Object.keys(jobs);
  return (
    <div style={{ maxHeight: 350 }}>
      {jobArray.map((_, index) => {
        const id = jobArray[jobArray.length - 1 - index];
        return <JobInfoCard key={id} id={id} job={jobs[id]} />;
      })}
    </div>
  );
};

const JobInfoCard = ({ id, job }) => {
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
        <Button size="small">More Info</Button>
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

export default StatusBar;

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { fetchJobs, updateJob, dismissJob } from '../../../actions/jobs';
import './StatusBar.css';
import { useProjectStore } from '../../Project/store';

import socket from '../../../socket';

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

export default StatusBar;

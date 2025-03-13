import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { fetchJobs, updateJob, dismissJob } from '../../actions/jobs';
import './StatusBar.css';
import './StatusBarNotification.css';
import { useProjectStore } from '../Project/store';

import socket from '../../socket';
import { Button, notification } from 'antd';
import { useSelectedJob, useShowJobInfo } from '../Jobs/store';

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

const DismissCountdown = ({ duration, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete && onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, onComplete]);

  return (
    <>
      Dismiss
      {timeLeft > 0 && <span style={{ fontWeight: 'bold' }}>({timeLeft})</span>}
    </>
  );
};

const JobStatusBar = () => {
  const [api, contextHolder] = notification.useNotification({
    top: 80,
  });
  const [output, setMessage] = useState('');
  const dispatch = useDispatch();

  const project = useProjectStore((state) => state.project);
  const [, setModalVisible] = useShowJobInfo();
  const [, setSelectedJob] = useSelectedJob();

  useEffect(() => {
    socket.on('cea-job-created', (job) => {
      console.log('cea-job-created: job', job);

      const key = job.id;
      api.info({
        key,
        message: job.script_label,
        description: 'Job created.',
        placement: 'top',
        className: 'cea-job-status-notification',
        duration: 1,
      });
    });

    socket.on('cea-worker-started', (job) => {
      dispatch(updateJob(job));

      const key = job.id;
      api.info({
        key,
        message: job.script_label,
        description: 'Job started.',
        placement: 'top',
        className: 'cea-job-status-notification',
        duration: 1,
      });
    });
    socket.on('cea-worker-success', (job) => {
      dispatch(updateJob(job));
      setMessage(`jobID: ${job.id} - completed ✅`);

      const key = job.id;
      const duration = 3;
      api.success({
        key,
        message: job.script_label,
        description: 'Job completed.',
        placement: 'top',
        className: 'cea-job-status-notification',
        duration,
        btn: (
          <Button
            type="default"
            size="small"
            onClick={() => {
              api.destroy(key);
              setSelectedJob(job);
              setModalVisible(true);
            }}
          >
            View Logs
          </Button>
        ),
      });
    });
    socket.on('cea-worker-canceled', (job) => {
      dispatch(dismissJob(job));
      setMessage(`jobID: ${job.id} - canceled ✖️`);
    });
    socket.on('cea-worker-error', (job) => {
      dispatch(updateJob(job));
      setMessage(`jobID: ${job.id} - error ❗`);

      const key = job.id;
      api.error({
        key,
        message: job.script_label,
        description: job.error,
        placement: 'top',
        className: 'cea-job-status-notification',
        duration: 0,
        btn: (
          <Button
            type="primary"
            size="small"
            onClick={() => {
              api.destroy(key);
              setSelectedJob(job);
              setModalVisible(true);
            }}
          >
            View Logs
          </Button>
        ),
      });
    });

    socket.on('cea-worker-message', (data) => {
      let lines = data.message
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
      let last_line = lines[lines.length - 1];
      last_line &&
        setMessage(`jobID: ${data.jobid} - ${last_line.substr(0, 80)}`);
    });

    return () => {
      socket.off('cea-job-created');

      socket.off('cea-worker-started');
      socket.off('cea-worker-success');
      socket.off('cea-worker-canceled');
      socket.off('cea-worker-error');

      socket.off('cea-worker-message');
    };
  }, []);

  useEffect(() => {
    // Refresh job list when project changes
    dispatch(fetchJobs());
  }, [project]);

  if (output.length < 1) return null;

  return (
    <div className="cea-status-bar-button">
      {contextHolder}
      <span>{output}</span>
    </div>
  );
};

export default StatusBar;

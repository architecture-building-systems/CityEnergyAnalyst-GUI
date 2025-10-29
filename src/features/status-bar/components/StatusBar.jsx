import { useState, useEffect, useMemo, useRef } from 'react';

import useJobsStore, {
  useSelectedJob,
  useShowJobInfo,
} from 'features/jobs/stores/jobsStore';
import './StatusBar.css';
import './StatusBarNotification.css';

import socket, { waitForConnection } from 'lib/socket';
import { Button, Dropdown, notification } from 'antd';
import { useSetActiveMapCategory } from 'features/project/components/Cards/MapLayersCard/store';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import { apiClient } from 'lib/api/axios';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { helpMenuItems, helpMenuUrls } from 'features/status-bar/constants';
import { HelpMenuItemsLabel } from 'features/status-bar/components/help-menu-items';
import { PLOT_SCRIPTS, VIEW_MAP_RESULTS } from 'features/plots/constants';

const StatusBar = () => {
  return (
    <div id="cea-status-bar-container">
      <div id="cea-status-bar-left">
        <CEAVersion />
      </div>
      <div id="cea-status-bar-right">
        <JobStatusBar />
        <div className="cea-status-bar-button primary">
          <DropdownMenu />
        </div>
      </div>
    </div>
  );
};

const CEAVersion = () => {
  const [version, setVersion] = useState();
  const getVersion = async () => {
    try {
      // First try to get version from browser API
      const electronVersion = await window?.api?.getAppVersion();
      if (electronVersion) {
        setVersion(`v${electronVersion}`);
        return;
      }

      // If that fails, try the server API
      const { data } = await apiClient.get('/server/version');
      if (data?.version) {
        setVersion(`v${data.version}`);
        return;
      }

      throw new Error('No version found');
    } catch (error) {
      console.error('Unable to determine CEA version:', error);
    }
  };

  useEffect(() => {
    getVersion();
  }, []);

  return (
    <div
      style={{
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
  const [output, setMessage] = useState('');
  const { updateJob, dismissJob } = useJobsStore();
  const setActiveMapCategory = useSetActiveMapCategory();

  const [, setModalVisible] = useShowJobInfo();
  const [, setSelectedJob] = useSelectedJob();

  const handlersRef = useRef(null);
  const depsRef = useRef({});

  // Keep latest function references in a ref
  depsRef.current = {
    updateJob,
    dismissJob,
    setActiveMapCategory,
    setModalVisible,
    setSelectedJob,
    setMessage,
  };

  useEffect(() => {
    notification.config({
      top: 80,
    });

    // Create stable handlers that access latest functions via ref
    if (!handlersRef.current) {
      handlersRef.current = {
        onJobCreated: (job) => {
          if (import.meta.env.DEV) {
            console.log('cea-job-created: job', job);
          }

          const key = job.id;
          notification.info({
            key,
            message: job.script_label,
            description: 'Job created.',
            placement: 'top',
            className: 'cea-job-status-notification',
            duration: 1,
          });
        },
        onWorkerStarted: (job) => {
          depsRef.current.updateJob(job);

          const key = job.id;
          notification.info({
            key,
            message: job.script_label,
            description: 'Job started.',
            placement: 'top',
            className: 'cea-job-status-notification',
            duration: 1,
          });
        },
        onWorkerSuccess: (job) => {
          depsRef.current.updateJob(job);
          depsRef.current.setMessage(`jobID: ${job.id} - completed ✅`);

          const isPlotJob = PLOT_SCRIPTS.includes(job.script) && job?.output;

          const key = job.id;
          const duration = isPlotJob ? 0 : 5;

          notification.success({
            key,
            message: job.script_label,
            description: 'Job completed.',
            placement: 'top',
            className: 'cea-job-status-notification',
            duration,
            btn: (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  size="small"
                  onClick={() => {
                    notification.destroy(key);
                    depsRef.current.setSelectedJob(job);
                    depsRef.current.setModalVisible(true);
                  }}
                >
                  View Logs
                </Button>

                {job.script in VIEW_MAP_RESULTS && (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      notification.destroy(key);
                      depsRef.current.setActiveMapCategory(
                        VIEW_MAP_RESULTS[job.script],
                      );
                    }}
                  >
                    View Results
                  </Button>
                )}

                {isPlotJob && (
                  <Button
                    type="primary"
                    size="small"
                    style={{ background: PLOTS_PRIMARY_COLOR }}
                    onClick={() => {
                      notification.destroy(key);
                      const plothtml = job.output;
                      // Create a blob from the HTML content
                      const blob = new Blob([plothtml], { type: 'text/html' });

                      // Create a URL for the blob
                      const url = URL.createObjectURL(blob);
                      const windowFeatures =
                        'width=1000,height=800,resizable=yes,status=yes,noopener,noreferrer';

                      // Open the URL in a new window/tab
                      const newWindow = window.open(
                        url,
                        '_blank',
                        windowFeatures,
                      );

                      // Clean up the URL object
                      if (newWindow) {
                        // Window opened successfully - revoke URL after it loads
                        newWindow.onload = () => {
                          // Revoke the URL after a delay to ensure it's loaded
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        };
                      } else {
                        // Popup blocked - revoke URL immediately to prevent leak
                        URL.revokeObjectURL(url);
                      }
                    }}
                  >
                    View Plot
                  </Button>
                )}
              </div>
            ),
          });
        },
        onWorkerCanceled: (job) => {
          depsRef.current.dismissJob(job);
          depsRef.current.setMessage(`jobID: ${job.id} - canceled ✖️`);
        },
        onWorkerError: (job) => {
          depsRef.current.updateJob(job);
          depsRef.current.setMessage(`jobID: ${job.id} - error ❗`);

          const key = job.id;
          notification.error({
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
                  notification.destroy(key);
                  depsRef.current.setSelectedJob(job);
                  depsRef.current.setModalVisible(true);
                }}
              >
                View Logs
              </Button>
            ),
          });
        },
        onWorkerMessage: (data) => {
          // Validate data and message before processing
          if (!data || typeof data.message !== 'string' || !data.message) {
            return;
          }

          const lines = data.message
            .split(/\r?\n/)
            .map((x) => x.trim())
            .filter((x) => x.length > 0);

          // Ensure lines array is not empty before accessing
          if (lines.length === 0) {
            return;
          }

          const last_line = lines[lines.length - 1];

          // Only call setMessage if both jobid and last_line exist
          if (data.jobid && last_line) {
            depsRef.current.setMessage(
              `jobID: ${data.jobid} - ${last_line.slice(0, 80)}`,
            );
          }
        },
      };
    }

    const H = handlersRef.current;

    // Remove all socket event listeners
    const removeSocketListeners = () => {
      socket.off('cea-job-created', H.onJobCreated);
      socket.off('cea-worker-started', H.onWorkerStarted);
      socket.off('cea-worker-success', H.onWorkerSuccess);
      socket.off('cea-worker-canceled', H.onWorkerCanceled);
      socket.off('cea-worker-error', H.onWorkerError);
      socket.off('cea-worker-message', H.onWorkerMessage);
    };

    // Register all socket event listeners
    const registerSocketListeners = () => {
      // Remove only our own handlers, then re-attach
      removeSocketListeners();

      socket.on('cea-job-created', H.onJobCreated);
      socket.on('cea-worker-started', H.onWorkerStarted);
      socket.on('cea-worker-success', H.onWorkerSuccess);
      socket.on('cea-worker-canceled', H.onWorkerCanceled);
      socket.on('cea-worker-error', H.onWorkerError);
      socket.on('cea-worker-message', H.onWorkerMessage);
    };

    // Wait for socket connection before registering listeners
    waitForConnection(() => {
      if (import.meta.env.DEV) {
        console.log('Socket connected, registering job event listeners');
      }
      registerSocketListeners();
    });

    // Re-register listeners on reconnection
    const handleReconnect = () => {
      if (import.meta.env.DEV) {
        console.log('Socket reconnected, re-registering job event listeners');
      }
      registerSocketListeners();
    };

    socket.on('connect', handleReconnect);

    return () => {
      socket.off('connect', handleReconnect);
      removeSocketListeners();
    };
  }, []);

  if (output.length < 1) return null;

  return (
    <div className="cea-status-bar-button">
      <span>{output}</span>
    </div>
  );
};

const DropdownMenu = () => {
  const menuItems = useMemo(
    () =>
      helpMenuItems.map((item) => {
        const { label, key } = item;
        const url = helpMenuUrls[key];

        return {
          ...item,
          label: <HelpMenuItemsLabel url={url} name={label} />,
        };
      }),
    [],
  );

  return (
    <Dropdown
      menu={{
        items: menuItems,
      }}
      trigger={['click']}
      placement="topLeft"
      arrow
    >
      <QuestionCircleOutlined />
    </Dropdown>
  );
};

export default StatusBar;

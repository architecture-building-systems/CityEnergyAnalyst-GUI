import { useState, useEffect, useMemo, useRef } from 'react';

import useJobsStore from 'features/jobs/stores/jobsStore';
import './StatusBar.css';
import './StatusBarNotification.css';

import socket, { waitForConnection } from 'lib/socket';
import { Button, Dropdown, notification } from 'antd';
import {
  useSetActiveMapCategory,
  MAP_LAYER_CATEGORIES_QUERY_KEY,
} from 'features/project/components/Cards/MapLayersCard/store';
import { useMapStore } from 'features/map/stores/mapStore';
import { useQueryClient } from '@tanstack/react-query';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import { useServerVersionQuery } from 'stores/useServerVersionQuery';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { helpMenuItems, helpMenuUrls } from 'features/status-bar/constants';
import { HelpMenuItemsLabel } from 'features/status-bar/components/help-menu-items';
import { PLOT_SCRIPTS, VIEW_MAP_RESULTS } from 'features/plots/constants';
import JobInfoModal from 'features/jobs/components/Jobs/JobInfoModal';
import DownloadManager from 'features/upload-download/components/DownloadManager';
import { isElectron } from 'utils/electron';
import { useIsValidUser } from 'stores/useUserQuery';

const StatusBar = () => {
  const isValidUser = useIsValidUser();

  return (
    <div id="cea-status-bar-container">
      <div id="cea-status-bar-left">
        <CEAVersion />
      </div>
      <div id="cea-status-bar-right">
        <JobStatusBar />
        {isValidUser && !isElectron() && <DownloadManager />}
        <div className="cea-status-bar-button primary">
          <DropdownMenu />
        </div>
      </div>
    </div>
  );
};

const CEAVersion = () => {
  const { data: version } = useServerVersionQuery();

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
  const setMapLayerParameters = useMapStore((state) => state.setMapLayerParameters);
  const bumpChoicesRevision = useMapStore((state) => state.bumpChoicesRevision);
  const queryClient = useQueryClient();

  // Local state for modal triggered from notifications
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const handlersRef = useRef(null);
  const depsRef = useRef({});

  // Keep latest function references in a ref
  depsRef.current = {
    updateJob,
    dismissJob,
    setActiveMapCategory,
    setMapLayerParameters,
    bumpChoicesRevision,
    setModalVisible,
    setSelectedJob,
    setMessage,
    queryClient,
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

          // When network-layout creates or modifies a network, any cached
          // metadata that lists existing networks goes stale: the tool forms'
          // network-name / existing-network dropdowns, the thermal-network map
          // layer's network selector (fetched directly in Choice.jsx, not via
          // React Query — bumpChoicesRevision forces those to refetch), and
          // the input-editor map data.
          //
          // Note: for thermal-network / thermal-network-multiple-phase we do
          // NOT auto-update the map viewer here. Refreshing the viewer to the
          // newly-run network is explicitly gated on the user clicking the
          // "View Results" notification button, so a running simulation can't
          // swap the map out from under them while they're looking at it.
          if (job.script === 'network-layout') {
            depsRef.current.queryClient.invalidateQueries({
              queryKey: ['toolParams'],
            });
            depsRef.current.queryClient.invalidateQueries({
              queryKey: MAP_LAYER_CATEGORIES_QUERY_KEY,
            });
            depsRef.current.queryClient.invalidateQueries({
              queryKey: ['inputs'],
            });
            depsRef.current.bumpChoicesRevision();
          }

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
                      // Invalidate the categories query so the layer fetches
                      // fresh parameter metadata (e.g. the just-created network
                      // becomes the most-recent default), clear cached params
                      // so the layer reinitialises with those defaults, bump
                      // the choices revision so any still-mounted Choice
                      // selector re-fetches its options immediately instead of
                      // relying on unmount/remount, then switch to the target
                      // category.
                      depsRef.current.queryClient.invalidateQueries({
                        queryKey: MAP_LAYER_CATEGORIES_QUERY_KEY,
                      });
                      depsRef.current.setMapLayerParameters(null);
                      depsRef.current.bumpChoicesRevision();
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
                        'width=1000,height=800,resizable=yes,scrollbars=yes,status=yes,noopener,noreferrer';

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

    // Register listeners on connection and reconnection
    const handleConnect = () => {
      if (import.meta.env.DEV) {
        console.log('Socket connected, registering job event listeners');
      }
      registerSocketListeners();
    };

    // Wait for initial connection, then register connect handler
    waitForConnection(() => {
      handleConnect();
      socket.on('connect', handleConnect);
    });

    return () => {
      socket.off('connect', handleConnect);
      removeSocketListeners();
    };
  }, []);

  if (output.length < 1 && !selectedJob) return null;

  return (
    <>
      {output.length > 0 && (
        <div className="cea-status-bar-button">
          <span>{output}</span>
        </div>
      )}
      {selectedJob && (
        <JobInfoModal
          job={selectedJob}
          visible={modalVisible}
          setVisible={setModalVisible}
        />
      )}
    </>
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

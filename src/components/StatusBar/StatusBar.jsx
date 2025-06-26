import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { updateJob, dismissJob } from '../../actions/jobs';
import './StatusBar.css';
import './StatusBarNotification.css';

import socket from '../../socket';
import { Button, notification } from 'antd';
import { useSelectedJob, useShowJobInfo } from '../Jobs/store';
import {
  DEMAND,
  SOLAR_IRRADIATION,
  RENEWABLE_ENERGY_POTENTIALS,
  THERMAL_NETWORK,
  LIFE_CYCLE_ANALYSIS,
} from '../Map/Layers/constants';
import { useSetActiveMapLayer } from '../Project/Cards/MapLayersCard/store';
import { useToolStore } from '../Tools/store';
import { PLOTS_PRIMARY_COLOR } from '../../constants/theme';
import { apiClient } from '../../api/axios';

// TODO: get mappings from backend
// Maps script name to map layer button name
const VIEW_MAP_RESULTS = {
  demand: DEMAND,
  radiation: SOLAR_IRRADIATION,
  'radiation-crax': SOLAR_IRRADIATION,
  photovoltaic: RENEWABLE_ENERGY_POTENTIALS,
  'photovoltaic-thermal': RENEWABLE_ENERGY_POTENTIALS,
  'solar-collector': RENEWABLE_ENERGY_POTENTIALS,
  'thermal-network': THERMAL_NETWORK,
  emissions: LIFE_CYCLE_ANALYSIS,
};

// Maps script name to plot script name
export const VIEW_PLOT_RESULTS = {
  [DEMAND]: 'plot-demand',
  [SOLAR_IRRADIATION]: null,
  [RENEWABLE_ENERGY_POTENTIALS]: null,
  [THERMAL_NETWORK]: null,
  [LIFE_CYCLE_ANALYSIS]: null,
};

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
  const [output, setMessage] = useState('');
  const dispatch = useDispatch();
  const setActiveMapLayer = useSetActiveMapLayer();
  const setSelectedTool = useToolStore((state) => state.setVisibility);

  const [, setModalVisible] = useShowJobInfo();
  const [, setSelectedJob] = useSelectedJob();

  useEffect(() => {
    notification.config({
      top: 80,
    });

    socket.on('cea-job-created', (job) => {
      console.log('cea-job-created: job', job);

      const key = job.id;
      notification.info({
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
      notification.info({
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

      // FIXME: check for exact plot script names instead
      const isPlotJob = job.script.startsWith('plot-') && job?.output;

      const key = job.id;
      let duration = isPlotJob ? 0 : 5;

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
                setSelectedJob(job);
                setModalVisible(true);
              }}
            >
              View Logs
            </Button>

            {Object.keys(VIEW_MAP_RESULTS).includes(job.script) && (
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  notification.destroy(key);

                  const plotScriptName =
                    VIEW_PLOT_RESULTS?.[VIEW_MAP_RESULTS[job.script]] ?? null;
                  setSelectedTool(plotScriptName);

                  setActiveMapLayer(VIEW_MAP_RESULTS[job.script]);
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
                    'width=1000,height=800,resizable=yes,status=yes';

                  // Open the URL in a new window/tab
                  const newWindow = window.open(url, '_blank', windowFeatures);

                  // Clean up the URL object when the window has loaded
                  if (newWindow) {
                    newWindow.onload = () => {
                      // Revoke the URL after a delay to ensure it's loaded
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    };
                  }
                }}
              >
                View Plot
              </Button>
            )}
          </div>
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

  if (output.length < 1) return null;

  return (
    <div className="cea-status-bar-button">
      <span>{output}</span>
    </div>
  );
};

export default StatusBar;

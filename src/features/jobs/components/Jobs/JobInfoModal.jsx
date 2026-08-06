import { Alert, Button, Modal } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { getSocket, waitForConnection } from 'lib/socket';
import { apiClient } from 'lib/api/axios';
import {
  VIEW_TOOL_RESULTS,
  buildPlotToolPrefillFromJob,
} from 'features/plots/constants';
import { useToolCardStore } from 'features/project/stores/tool-card';
import { JobStartedAgo } from './JobInfoCard';

const JobOutputModal = ({ job, visible, setVisible }) => {
  const [message, setMessage] = useState('');
  const [stderr, setStderr] = useState(job?.stderr ?? '');
  const socket = getSocket();
  const containerRef = useRef();
  const shouldScrollRef = useRef(true); // Control auto-scrolling behavior
  const selectPlotTool = useToolCardStore((state) => state.selectPlotTool);

  // Scroll to bottom if shouldScroll is true
  const scrollToBottom = () => {
    if (containerRef.current && shouldScrollRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  // Check if scroll is near bottom
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // Consider "near bottom" if within 50px of the bottom
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      shouldScrollRef.current = isNearBottom;
    }
  };

  // Scroll to bottom when message changes
  useEffect(() => {
    scrollToBottom();
  }, [message]);

  // Scroll to bottom when modal becomes visible
  useEffect(() => {
    if (visible) {
      setTimeout(scrollToBottom, 100); // Small delay to ensure content is rendered
    }
  }, [visible]);

  // Load job output and register socket listener when modal opens
  useEffect(() => {
    if (!visible) return;

    // Load initial job output
    const getJobOutput = async () => {
      try {
        const resp = await apiClient.get(
          `/server/streams/read/${job.id}`,
          null,
          { responseType: 'text' },
        );
        setMessage(resp?.data ?? '');
        shouldScrollRef.current = true;
      } catch (error) {
        console.error(error);
      }
    };

    getJobOutput();

    // The job list/SocketIO events never include stderr (the dashboard only returns log
    // text from GET /server/jobs/{id}, to avoid pulling large log text into paginated/event
    // payloads) -- fetch it here, covering jobs that errored before this session started.
    const getJobStderr = async () => {
      try {
        const resp = await apiClient.get(`/server/jobs/${job.id}`);
        setStderr(resp?.data?.stderr ?? '');
      } catch (error) {
        console.error(error);
      }
    };

    getJobStderr();

    // Message handler for this specific job
    const message_appender = (data) => {
      if (data.jobid == job.id) {
        setMessage((prevMessage) => prevMessage.concat(data.message));
      }
    };

    // Register socket listener
    waitForConnection(() => {
      socket.on('cea-worker-message', message_appender);

      if (import.meta.env.DEV) {
        console.log('Registered socket listener for job', job.id);
      }
    });

    // Cleanup: remove listener when modal closes or unmounts
    return () => {
      socket.off('cea-worker-message', message_appender);

      if (import.meta.env.DEV) {
        console.log('Removed socket listener for job', job.id);
      }
    };
  }, [visible, job.id, socket]);

  return (
    <Modal
      title="Job Info"
      open={visible}
      width={800}
      footer={false}
      onCancel={() => setVisible(false)}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <b>{job?.script_label ?? job?.script}</b>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,

                color: 'gray',
                fontSize: 12,
              }}
            >
              <span className="cea-job-info-id" title={job?.id}>
                {job?.id?.slice(0, 8)}
              </span>
              <span>-</span>
              <JobStartedAgo startTime={job?.start_time} short={false} />
            </div>
          </div>

          <div>
            Scenario:{' '}
            <span style={{ color: 'gray' }}>{job?.scenario_name}</span>
          </div>
        </div>

        {job.state === 1 && <Alert title="Job running..." type="info" />}
        {job.state === 2 && <Alert title="Job completed" type="success" />}
        {job?.error && <Alert title={job.error} type="error" />}

        {job.state === 2 && VIEW_TOOL_RESULTS[job.script] && (
          <Button
            type="primary"
            onClick={() => {
              setVisible(false);
              selectPlotTool(VIEW_TOOL_RESULTS[job.script], {
                prefill: buildPlotToolPrefillFromJob(job),
              });
            }}
          >
            View Results
          </Button>
        )}

        <b>Output log:</b>
        <div
          ref={containerRef}
          style={{
            maxHeight: 400,
            overflow: 'auto',
            fontSize: 12,
            border: '1px solid #ccc',
            borderRadius: 12,
            paddingInline: 18,
          }}
          onScroll={handleScroll}
        >
          {message ? (
            <pre
              style={{
                whiteSpace: 'pre-wrap',
              }}
            >
              {message}
            </pre>
          ) : (
            <div>No output found.</div>
          )}
        </div>

        {stderr && (
          <details>
            <summary>
              <b>Show full error log</b>
            </summary>
            <div
              style={{
                maxHeight: 250,
                overflow: 'auto',
                fontSize: 12,
                border: '1px solid #ccc',
                borderRadius: 12,
                paddingInline: 18,

                marginTop: 8,
              }}
            >
              <pre style={{ whiteSpace: 'pre-wrap' }}>{stderr}</pre>
            </div>
          </details>
        )}
      </div>
    </Modal>
  );
};

export default JobOutputModal;

import { Alert, Button, Modal } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { getSocket, waitForConnection } from 'lib/socket';
import { apiClient } from 'lib/api/axios';
import {
  VIEW_TOOL_RESULTS,
  buildPlotToolPrefillFromJob,
} from 'features/plots/constants';
import { useToolCardStore } from 'features/project/stores/tool-card';

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
      title={`Job Info - ${job.script_label} [${job.scenario_name}]`}
      open={visible}
      width={800}
      footer={false}
      onCancel={() => setVisible(false)}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

        <details>
          <summary>More Info</summary>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,

              marginBlock: 12,
              fontFamily: 'monospace',
            }}
          >
            <div>
              id:{' '}
              <span
                style={{
                  background: 'ghostwhite',
                  borderRadius: 8,
                  padding: 4,
                }}
              >
                {job.id}
              </span>
            </div>
            <div>
              created_time: {new Date(job.created_time).toLocaleString()}
            </div>
            <div>
              start_time:{' '}
              {job?.start_time
                ? new Date(job.start_time).toLocaleString()
                : '-'}
            </div>
            <div>
              end_time:{' '}
              {job?.end_time ? new Date(job.end_time).toLocaleString() : '-'}
            </div>
          </div>
          {stderr && (
            <details>
              <summary>Show full error log</summary>
              <div
                style={{
                  maxHeight: 100,
                  overflow: 'auto',
                  fontSize: 9,
                  border: '1px solid #ccc',
                  borderRadius: 12,
                  paddingInline: 18,
                }}
              >
                <pre>{stderr}</pre>
              </div>
            </details>
          )}
        </details>

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
                fontSize: 12,
                whiteSpace: 'pre-wrap',
              }}
            >
              {message}
            </pre>
          ) : (
            <div>No output found.</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default JobOutputModal;

import { Alert, Modal } from 'antd';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

import socket from '../../socket';

const JobOutputModal = ({ job, visible, setVisible }) => {
  const [message, setMessage] = useState('');
  const isFirst = useRef(true);
  const listenerFuncRef = useRef(null);
  const containerRef = useRef();
  const shouldScrollRef = useRef(true); // Control auto-scrolling behavior

  const message_appender = (data) => {
    if (data.jobid == job.id) {
      setMessage((message) => message.concat(data.message));
    }
  };

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

  useEffect(() => {
    const getJobOutput = async () => {
      try {
        const resp = await axios.get(
          `${import.meta.env.VITE_CEA_URL}/server/streams/read/${job.id}`,
          null,
          { responseType: 'text' },
        );
        setMessage(resp?.data ?? '');
        // Reset shouldScroll when loading a new job
        shouldScrollRef.current = true;
      } catch (error) {
        console.error(error);
      }
    };
    listenerFuncRef.current &&
      socket.off('cea-worker-message', listenerFuncRef.current);
    isFirst.current = true;
    getJobOutput();
  }, [job]);

  useEffect(() => {
    if (isFirst.current) {
      listenerFuncRef.current = message_appender;
      socket.on('cea-worker-message', message_appender);
      isFirst.current = false;
    }
    // Scroll to bottom when message changes
    scrollToBottom();
  }, [message]);

  // Scroll to bottom when modal becomes visible
  useEffect(() => {
    if (visible) {
      setTimeout(scrollToBottom, 100); // Small delay to ensure content is rendered
    }
  }, [visible]);

  return (
    <Modal
      title={`[${job.id}] - ${job.script_label}`}
      open={visible}
      width={800}
      footer={false}
      onCancel={() => setVisible(false)}
      destroyOnClose
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {job.state == 1 && <Alert message="Job running..." type="info" />}
        {job.state == 2 && <Alert message="Job completed" type="success" />}
        {job?.error && <Alert message={job.error} type="error" />}

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
          <pre
            style={{
              fontSize: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {message}
          </pre>
        </div>
      </div>
    </Modal>
  );
};

export default JobOutputModal;

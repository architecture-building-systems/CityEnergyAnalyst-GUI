import { Modal } from 'antd';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useEffect, useRef, useState } from 'react';

import './JobInfoList.css';
import socket from '../../socket';
import JobInfoCard from './JobInfoCard';

export const JobInfoList = () => {
  const jobs = useSelector((state) => state.jobs);

  const [selectedJob, setSelectedJob] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const jobArray = Object.keys(jobs ?? {});
  const containerRef = useRef(null);

  const jobInfos = jobArray.map((_, index) => {
    const id = jobArray[jobArray.length - 1 - index];
    return (
      <JobInfoCard
        key={id}
        id={id}
        job={jobs[id]}
        setModalVisible={setModalVisible}
        setSelectedJob={setSelectedJob}
        verbose={expanded}
      />
    );
  });

  const goToBottom = () => {
    if (containerRef.current) {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        container.scrollTop = container.scrollHeight;
      });
    }
  };

  useEffect(() => {
    if (!jobArray.length) setExpanded(false);

    // if (containerRef.current && jobLengthRef.current < jobArray.length) {
    //   const container = containerRef.current;
    //   // Scroll to bottom when new job is added
    //   container.scrollTo({
    //     top: container.scrollHeight,
    //     behavior: 'smooth',
    //   });
    // }
    // jobLengthRef.current = jobArray.length;
  }, [jobArray.length]);

  useEffect(() => {
    goToBottom();
  }, [expanded]);

  return (
    <>
      {jobArray.length > 0 && (
        <div
          className={`cea-job-info-card-list ${expanded ? 'expanded' : 'collapsed'}`}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          ref={containerRef}
          style={{
            overflow: expanded ? 'auto' : 'hidden',
          }}
        >
          {jobInfos}
        </div>
      )}
      {selectedJob && (
        <JobOutputModal
          job={selectedJob}
          visible={modalVisible}
          setVisible={setModalVisible}
        />
      )}
    </>
  );
};

const JobOutputModal = ({ job, visible, setVisible }) => {
  const [message, setMessage] = useState('');
  const isFirst = useRef(true);
  const listenerFuncRef = useRef(null);

  const message_appender = (data) => {
    if (data.jobid == job.id) {
      setMessage((message) => message.concat(data.message));
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
        setMessage(resp.data);
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
  }, [message]);

  return (
    <Modal
      title={`Job Output for ${job.id} - ${job.script}`}
      open={visible}
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
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </pre>
      </div>
    </Modal>
  );
};

export default JobInfoList;

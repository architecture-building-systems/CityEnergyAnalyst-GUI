import { useSelector } from 'react-redux';
import { useEffect, useRef, useState } from 'react';

import './JobInfoList.css';
import JobInfoCard from './JobInfoCard';
import JobInfoModal from './JobInfoModal';
import { useSelectedJob, useShowJobInfo } from './store';

export const JobInfoList = () => {
  const jobs = useSelector((state) => state.jobs);

  const [selectedJob, setSelectedJob] = useSelectedJob();
  const [modalVisible, setModalVisible] = useShowJobInfo();
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
        <JobInfoModal
          job={selectedJob}
          visible={modalVisible}
          setVisible={setModalVisible}
        />
      )}
    </>
  );
};

export default JobInfoList;

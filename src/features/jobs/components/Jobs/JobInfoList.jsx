import { useEffect, useRef, useState } from 'react';

import './JobInfoList.css';
import JobInfoCard from './JobInfoCard';
import JobInfoModal from './JobInfoModal';
import useJobsStore, {
  useSelectedJob,
  useShowJobInfo,
} from 'features/jobs/stores/jobsStore';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useIsValidUser } from 'stores/userStore';

const useFetchJobs = (project) => {
  const { jobs, fetchJobs } = useJobsStore();
  const isValidUser = useIsValidUser();

  useEffect(() => {
    // Refresh job list when project changes. Only fetch if project is set.
    if (isValidUser && project) fetchJobs();
  }, [project, fetchJobs, isValidUser]);

  return jobs;
};

export const JobInfoList = ({ style }) => {
  const project = useProjectStore((state) => state.project);
  const jobs = useFetchJobs(project);

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

  // Don't render if no project is selected
  if (!project || jobArray.length === 0) return null;

  return (
    <>
      <div
        className={`cea-job-info-card-list ${expanded ? 'expanded' : 'collapsed'}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        ref={containerRef}
        style={{
          overflow: expanded ? 'auto' : 'hidden',
          ...style,
        }}
      >
        {jobInfos}
      </div>
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

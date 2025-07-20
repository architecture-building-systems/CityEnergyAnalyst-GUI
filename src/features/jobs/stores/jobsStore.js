import { create } from 'zustand';
import { useCallback } from 'react';
import { apiClient } from 'lib/api/axios';

const transformInitialPayload = (payload) => {
  const out = {};
  payload.forEach((job) => {
    const { id, ...props } = job;
    out[id] = props;
  });
  return out;
};

const transformJobPayload = (payload) => {
  const { id, ...props } = payload;
  return { [id]: { ...props } };
};

const useJobsStore = create((set, get) => ({
  jobs: null,

  selectedJob: null,
  showJobInfo: false,
  setSeletedJob: (selectedJob) => set({ selectedJob }),
  setShowJobInfo: (showJobInfo) => set({ showJobInfo }),

  // Actions
  fetchJobs: async () => {
    try {
      const response = await apiClient.get('/server/jobs/');
      set({ jobs: transformInitialPayload(response.data) });
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  },

  createJob: async (script, parameters) => {
    try {
      const response = await apiClient.post('/server/jobs/new', {
        script,
        parameters,
      });

      const jobData = response.data;
      set((state) => ({
        jobs: { ...state.jobs, ...transformJobPayload(jobData) },
      }));

      // Start the job after creation
      await get().startJob(jobData.id);

      return jobData;
    } catch (error) {
      console.error('Failed to create job:', error);
      throw error;
    }
  },

  startJob: async (jobID) => {
    try {
      const response = await apiClient.post(`/server/jobs/start/${jobID}`);
      console.debug('Job started:', response.data);
    } catch (error) {
      console.error('Failed to start job:', error);
    }
  },

  updateJob: (job) => {
    console.debug('Updating job:', job);
    set((state) => ({
      jobs: { ...state.jobs, ...transformJobPayload(job) },
    }));
  },

  dismissJob: (job) => {
    console.log('in dismissJob');
    console.log(`cancelling job ${job.id}`);
    set((state) => ({
      jobs: { ...state.jobs, ...transformJobPayload(job) },
    }));
  },

  deleteJob: async (jobID) => {
    try {
      await apiClient.delete(`/server/jobs/${jobID}`);
      set((state) => {
        const newJobs = { ...state.jobs };
        delete newJobs[jobID];
        return { jobs: newJobs };
      });
      console.debug('Job deleted:', jobID);
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  },
}));

export const useSelectedJob = () => [
  useJobsStore((state) => state.selectedJob),
  useJobsStore((state) => state.setSeletedJob),
];

export const useShowJobInfo = () => [
  useJobsStore((state) => state.showJobInfo),
  useJobsStore((state) => state.setShowJobInfo),
];

export default useJobsStore;

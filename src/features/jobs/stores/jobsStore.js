import { create } from 'zustand';
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
    const formattedData = {};

    Object.keys(parameters).forEach((key) => {
      // Convert objects to strings
      if (
        typeof parameters[key] === 'object' &&
        !(parameters[key] instanceof File)
      ) {
        formattedData[key] = JSON.stringify(parameters[key]);
      } else {
        formattedData[key] = parameters[key];
      }
    });

    try {
      const response = await apiClient.postForm('/server/jobs/new', {
        script,
        parameters: formattedData,
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
      if (import.meta.env.DEV) {
        console.debug('Job started:', response.data);
      }
    } catch (error) {
      console.error('Failed to start job:', error);
    }
  },

  updateJob: (job) => {
    if (import.meta.env.DEV) {
      console.debug('Updating job:', job);
    }
    set((state) => ({
      jobs: { ...state.jobs, ...transformJobPayload(job) },
    }));
  },

  dismissJob: (job) => {
    if (import.meta.env.DEV) {
      console.debug(`Cancelling job ${job.id}`);
    }
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
      if (import.meta.env.DEV) {
        console.debug('Job deleted:', jobID);
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  },
}));

// Selector hook that returns jobs as a sorted array (newest first)
export const useSortedJobs = () => {
  const jobs = useJobsStore((state) => state.jobs);

  if (!jobs) return [];

  return Object.entries(jobs)
    .map(([id, job]) => ({ id, ...job }))
    .sort((a, b) => {
      const timeA = new Date(a.created_time);
      const timeB = new Date(b.created_time);
      return timeB - timeA; // Descending order (newest first)
    });
};

export default useJobsStore;

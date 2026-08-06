import { create } from 'zustand';
import { apiClient } from 'lib/api/axios';
import {
  activeScenarioHeaders,
  scenarioHeaders,
} from 'lib/api/scenarioContext';

const JOBS_PAGE_SIZE = 10;

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
  hasMore: true,
  nextOffset: 0,

  // Actions
  fetchJobs: async () => {
    try {
      const response = await apiClient.get('/server/jobs/', {
        headers: activeScenarioHeaders(),
        params: { limit: JOBS_PAGE_SIZE },
      });
      set({
        jobs: transformInitialPayload(response.data),
        hasMore: response.data.length >= JOBS_PAGE_SIZE,
        nextOffset: response.data.length,
      });
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  },

  fetchMoreJobs: async () => {
    const { jobs, nextOffset } = get();
    if (!jobs) return;
    try {
      const response = await apiClient.get('/server/jobs/', {
        headers: activeScenarioHeaders(),
        params: { limit: JOBS_PAGE_SIZE, offset: nextOffset },
      });
      set((state) => ({
        jobs: { ...state.jobs, ...transformInitialPayload(response.data) },
        hasMore: response.data.length >= JOBS_PAGE_SIZE,
        nextOffset: state.nextOffset + response.data.length,
      }));
    } catch (error) {
      console.error('Failed to fetch more jobs:', error);
    }
  },

  // `scenarioContext`, when supplied, pins the request's X-CEA-* headers to an
  // explicit `{ project, scenarioName, childScenario }` instead of the store's
  // currently-active scenario (`activeScenarioHeaders()`). Needed for scripts that
  // must always target the *parent* scenario regardless of which child pathway state
  // is active in the UI — the backend resolves `parameters.scenario` from these same
  // headers (see cea/interfaces/dashboard/server/AGENTS.md), so passing
  // `childScenario: null` here is what keeps such a job on the parent scenario.
  createJob: async (script, parameters, scenarioContext) => {
    // The backend resolves `scenario` from the request's X-CEA-* headers and
    // discards whatever the client sends here (see the DO block above) --
    // drop a stray `parameters.scenario` from a stale caller so headers stay
    // the only client-side scenario source, instead of forwarding a value
    // that's misleading if it's ever read back off a saved job record.
    const { scenario: _scenario, ...jobParameters } = parameters;
    const formattedData = {};

    Object.keys(jobParameters).forEach((key) => {
      // Convert objects to strings
      if (
        typeof jobParameters[key] === 'object' &&
        !(jobParameters[key] instanceof File)
      ) {
        formattedData[key] = JSON.stringify(jobParameters[key]);
      } else {
        formattedData[key] = jobParameters[key];
      }
    });

    try {
      const response = await apiClient.postForm(
        '/server/jobs/new',
        {
          script,
          parameters: formattedData,
        },
        {
          headers: scenarioContext
            ? scenarioHeaders(scenarioContext)
            : activeScenarioHeaders(),
        },
      );

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

  cancelJob: async (jobID) => {
    try {
      await apiClient.post(`/server/jobs/cancel/${jobID}`);
    } catch (error) {
      console.error('Failed to cancel job:', error);
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

export const useCreateJob = () => useJobsStore((state) => state.createJob);

export default useJobsStore;

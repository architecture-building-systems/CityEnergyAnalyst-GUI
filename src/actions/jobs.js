import axios from 'axios';

export const FETCH_JOBS = 'FETCH_JOBS';
export const FETCH_JOBS_SUCCESS = 'FETCH_JOBS_SUCCESS';
export const FETCH_JOBS_FAILED = 'FETCH_JOBS_FAILED';

export const fetchJobs = () => {
  return async (dispatch) => {
    dispatch({ type: FETCH_JOBS });
    try {
      const jobs = await axios.get(
        `${import.meta.env.VITE_CEA_URL}/server/jobs/list`
      );
      dispatch({ type: FETCH_JOBS_SUCCESS, payload: jobs.data });
    } catch (error) {
      dispatch({ type: FETCH_JOBS_FAILED, payload: error });
    }
  };
};

export const CREATE_JOB = 'CREATE_JOB';
export const CREATE_JOB_SUCCESS = 'CREATE_JOB_SUCCESS';
export const CREATE_JOB_FAILED = 'CREATE_JOB_FAILED';

export const createJob = (script, parameters) => {
  return async (dispatch) => {
    dispatch({ type: CREATE_JOB });
    try {
      const job_info = await axios.post(
        `${import.meta.env.VITE_CEA_URL}/server/jobs/new`,
        { script, parameters }
      );
      dispatch({ type: CREATE_JOB_SUCCESS, payload: job_info.data });
      dispatch(startJob(job_info.data.id));
    } catch (error) {
      dispatch({ type: CREATE_JOB_FAILED, payload: error });
    }
  };
};

export const START_JOB = 'START_JOB';
export const START_JOB_SUCCESS = 'START_JOB_SUCCESS';
export const START_JOB_FAILED = 'START_JOB_FAILED';

export const startJob = (jobID) => {
  return async (dispatch) => {
    dispatch({ type: START_JOB });
    try {
      const job = await axios.post(
        `${import.meta.env.VITE_CEA_URL}/server/jobs/start/${jobID}`
      );
      dispatch({ type: START_JOB_SUCCESS, payload: job.data });
    } catch (error) {
      dispatch({ type: START_JOB_FAILED, payload: error });
    }
  };
};

export const UPDATE_JOB = 'UPDATE_JOB';

export const updateJob = (job) => {
  return { type: UPDATE_JOB, payload: job };
};

export const DISMISS_JOB = 'DISMISS_JOB';

export const dismissJob = (job) => {
  console.log('in dismissJob');
  return (dispatch) => {
    console.log(`cancelling job ${job.id}`);
    dispatch({ type: DISMISS_JOB, payload: job });
  };
};

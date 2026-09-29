import { isElectron } from 'utils/electron';

// Mirrors JobState in the backend (cea/interfaces/dashboard/lib/database/models.py).
const JOB_OUTCOMES = {
  2: 'completed',
  3: 'failed',
  4: 'canceled',
  5: 'killed',
};

export const isJobFinishedState = (state) => state in JOB_OUTCOMES;

const jobDurationSeconds = (job) => {
  if (typeof job.duration === 'number') return job.duration;
  if (job.start_time && job.end_time) {
    const seconds = (new Date(job.end_time) - new Date(job.start_time)) / 1000;
    if (Number.isFinite(seconds)) return seconds;
  }
  return undefined;
};

// Error text can carry column, scenario or file names, so a failed job reports only its
// exception class (`KeyError`, `ValueError`, ...), taken from a leading `SomeError:` prefix.
const jobErrorType = (error) => {
  const prefix = String(error ?? '')
    .split(':')[0]
    .trim();
  const isClassName =
    /^\w+$/.test(prefix) && /(Error|Exception|Exit)$/.test(prefix);
  return isClassName ? prefix : 'unknown';
};

/**
 * Anonymous usage tracking: one `job_finished` event when a tool job reaches a final state.
 * Deliberately carries no user, project, scenario or parameter information, and no ID of any
 * kind (PostHog runs cookieless -- see lib/posthog.js), so events can be counted but never
 * linked to a person. A failed job adds only its exception class, never the message text.
 * @param {{ script?: string, state: number, error?: string, duration?: number,
 *   start_time?: string, end_time?: string }} job
 */
export const trackJobFinished = (job) => {
  const outcome = JOB_OUTCOMES[job.state];
  if (!outcome) return;

  const properties = {
    script: job.script,
    outcome,
    duration_seconds: jobDurationSeconds(job),
    platform: isElectron() ? 'electron' : 'web',
  };
  if (outcome === 'failed') properties.error_type = jobErrorType(job.error);

  try {
    window.posthog?.capture?.('job_finished', properties);
  } catch {
    // Tracking must never throw.
  }
};

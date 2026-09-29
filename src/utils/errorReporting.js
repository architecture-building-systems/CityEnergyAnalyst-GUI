/**
 * Single hook point for reporting caught UI errors.
 *
 * Forwards to PostHog when the app has loaded it (`window.posthog`), otherwise only logs to the
 * console. See lib/posthog.js for the cookieless init. Callers must pass diagnostics that are
 * safe to send: types and key names, never user-entered values.
 */

// Same error (message + top stack frame) is sent at most once per window, so a render loop or
// a failing timer can't flood PostHog.
const DEDUPE_WINDOW_MS = 60_000;
const recentlyReported = new Map();

const isDuplicate = (error) => {
  const now = Date.now();
  const topFrame = error?.stack?.split('\n')[1]?.trim() ?? '';
  const fingerprint = `${error?.message}|${topFrame}`;
  const last = recentlyReported.get(fingerprint);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return true;
  recentlyReported.set(fingerprint, now);
  return false;
};

/**
 * @param {Error} error
 * @param {Record<string, unknown>} [context]
 */
export const reportError = (error, context = {}) => {
  console.error('[reportError]', error, context);
  try {
    if (isDuplicate(error)) return;
    window.posthog?.capture?.('ui_error', {
      message: error?.message,
      stack: error?.stack,
      ...context,
    });
  } catch {
    // Reporting must never throw from inside an error handler.
  }
};

const toError = (reason) =>
  reason instanceof Error ? reason : new Error(String(reason));

/**
 * Reports errors that no React boundary can catch: exceptions in event handlers and timers
 * (`error`) and rejected promises nobody handled (`unhandledrejection`).
 */
export const installGlobalErrorHandlers = () => {
  window.addEventListener('error', (event) => {
    // Resource load failures (img/script) fire `error` on the element with no `error` object.
    if (!event.error) return;
    reportError(event.error, { area: 'window-error' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportError(toError(event.reason), { area: 'unhandled-rejection' });
  });
};

// Paths can carry usernames, project and scenario names.
const redactPaths = (text) =>
  text
    .split(' ')
    .map((token) => (/[\\/]/.test(token) ? '<path>' : token))
    .join(' ');

/**
 * Reports a CEA tool job that ended in an error. Only the script name and a path-redacted
 * first line of the error are sent -- no parameters, scenario or project names.
 * @param {{ id?: string|number, script?: string, error?: string }} job
 */
export const reportJobFailure = (job) => {
  const firstLine = redactPaths(String(job?.error ?? '').split('\n')[0]).slice(
    0,
    300,
  );
  const error = new Error(firstLine || 'Job failed without an error message');
  console.error('[reportJobFailure]', job?.script, firstLine);
  try {
    window.posthog?.capture?.('job_failed', {
      script: job?.script,
      message: error.message,
    });
  } catch {
    // Reporting must never throw.
  }
};

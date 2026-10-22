import { app } from 'electron';

const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

// A startup failure is reported at most once per run, so a timeout followed by an exit is one event.
let startupFailureReported = false;

/**
 * Anonymous, fire-and-forget report of a failure that happens before the renderer (and its
 * posthog-js, see src/lib/posthog.js) exists. No-op unless VITE_POSTHOG_KEY was set at build
 * time and the app is packaged, so dev and self-built copies send nothing.
 *
 * Only a fixed stage token, an exit code or error class name and platform info are sent -- never
 * error messages, stderr or paths. The distinct_id is random per event and never stored.
 * @param {string} stage fixed token, e.g. `env_check`, `env_create`, `backend_exit`
 * @param {{ exitCode?: number | null, signal?: string | null, error?: unknown }} [details]
 */
export const reportStartupFailure = (
  stage,
  { exitCode, signal, error } = {},
) => {
  if (!key || !app.isPackaged || startupFailureReported) return;
  startupFailureReported = true;

  const properties = {
    stage,
    cea_version: app.getVersion(),
    os: process.platform,
    arch: process.arch,
    $process_person_profile: false,
  };
  if (exitCode != null) properties.exit_code = exitCode;
  if (signal) properties.signal = signal;
  if (error instanceof Error) properties.error_type = error.constructor.name;

  fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      event: 'app_startup_failed',
      distinct_id: crypto.randomUUID(),
      properties,
    }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    // Telemetry must never affect startup.
  });
};

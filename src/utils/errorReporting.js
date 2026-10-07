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
  // Evict expired fingerprints so a stream of distinct errors can't grow the map unbounded.
  if (recentlyReported.size > 200) {
    for (const [key, timestamp] of recentlyReported) {
      if (now - timestamp >= DEDUPE_WINDOW_MS) recentlyReported.delete(key);
    }
  }
  recentlyReported.set(fingerprint, now);
  return false;
};

// Paths can carry usernames, project and scenario names.
export const redactPaths = (text) =>
  text
    .split(' ')
    .map((token) => (/[\\/]/.test(token) ? '<path>' : token))
    .join(' ');

const PATH_SEPARATORS = /[\\/]/;

/**
 * Stack traces need their file and line numbers to be useful, but the directory part can carry
 * usernames (Electron `file://` install paths). Keeps only the last path segment of every
 * path-like token, e.g. `(https://host/assets/App-1a2b.js:1:2)` -> `(App-1a2b.js:1:2)`.
 */
export const redactStack = (text) =>
  text
    .split(' ')
    .map((token) => {
      if (!PATH_SEPARATORS.test(token)) return token;
      const open = token.startsWith('(') ? '(' : '';
      const close = token.endsWith(')') ? ')' : '';
      const inner = token.slice(open.length, token.length - close.length);
      return `${open}${inner.split(PATH_SEPARATORS).pop()}${close}`;
    })
    .join(' ');

const redactIfString = (value, redact) =>
  typeof value === 'string' ? redact(value) : value;

/**
 * @param {Error} error
 * @param {Record<string, unknown>} [context]
 */
export const reportError = (error, context = {}) => {
  console.error('[reportError]', error, context);
  try {
    if (isDuplicate(error)) return;
    window.posthog?.capture?.('ui_error', {
      ...context,
      componentStack: redactIfString(context.componentStack, redactStack),
      message: redactIfString(error?.message, redactPaths),
      stack: redactIfString(error?.stack, redactStack),
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

/**
 * Single hook point for reporting caught UI errors.
 *
 * Forwards to PostHog when the app has loaded it (`window.posthog`), otherwise only logs to the
 * console. PostHog isn't a dependency of this repo yet -- to enable reporting, load it with
 * cookieless settings (`persistence: 'memory'`) and it will be picked up here with no other
 * change. Callers must pass diagnostics that are safe to send: types and key names, never
 * user-entered values.
 * @param {Error} error
 * @param {Record<string, unknown>} [context]
 */
export const reportError = (error, context = {}) => {
  console.error('[reportError]', error, context);
  try {
    window.posthog?.capture?.('ui_error', {
      message: error?.message,
      stack: error?.stack,
      ...context,
    });
  } catch {
    // Reporting must never throw from inside an error handler.
  }
};

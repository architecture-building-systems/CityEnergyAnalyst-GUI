import posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

/**
 * Initialises PostHog for error reporting only (see utils/errorReporting.js). A no-op unless
 * VITE_POSTHOG_KEY is set at build time, so dev and self-built copies send nothing.
 *
 * Cookieless by design: `persistence: 'memory'` stores nothing in cookies/localStorage, so no
 * consent banner is needed, and every tracking feature except explicit `capture` is off.
 */
export const initPostHog = () => {
  if (!key) return;

  posthog.init(key, {
    api_host: host,
    persistence: 'memory',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_flags: true,
  });
  window.posthog = posthog;
};

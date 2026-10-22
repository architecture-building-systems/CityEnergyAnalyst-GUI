import posthog from 'posthog-js';

import { installGlobalErrorHandlers } from 'utils/errorReporting';

const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

// The packaged Electron app loads from file:///C:/Users/<name>/..., which would leak the OS
// username through $current_url and friends. Keep only the in-app hash route.
// Paths may contain spaces (e.g. "C:/Users/Jane Doe/..."), so match up to the fragment or line end.
const FILE_URL = /file:\/\/\/[^#\r\n]*/g;
const redactFileUrls = (event) => {
  if (window.location.protocol !== 'file:' || !event) return event;

  const seen = new WeakSet();
  const scrub = (value) => {
    if (typeof value === 'string')
      return value.replace(FILE_URL, 'app://electron/');
    if (!value || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        value[i] = scrub(item);
      });
    } else {
      for (const k of Object.keys(value)) value[k] = scrub(value[k]);
    }
    return value;
  };
  for (const bag of [event.properties, event.$set, event.$set_once]) scrub(bag);
  if (event.properties) event.properties.$pathname = '/';
  return event;
};

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
    capture_exceptions: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_flags: true,
    before_send: redactFileUrls,
  });
  window.posthog = posthog;
  installGlobalErrorHandlers();
};

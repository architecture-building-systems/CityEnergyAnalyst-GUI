import axios from 'axios';

import useDemoStore from 'stores/demoStore';
import {
  PROJECT_HEADER,
  SCENARIO_NAME_HEADER,
  CHILD_SCENARIO_HEADER,
} from 'lib/api/scenarioContextHeaders';

import { apiClient, demoClient } from './axios';

// Interceptors are registered once at module load and there's no public API
// to invoke them in isolation, so tests reach into the axios interceptor
// manager directly - this is the standard way to unit-test an axios
// interceptor without a real network layer or an extra mocking dependency.
const demoInterceptor = demoClient.interceptors.request.handlers[0].fulfilled;
// Registration order in axios.js: addAuthInterceptor() runs before the
// stripFiles interceptor is registered, so index 0 is always the auth one.
const apiAuthInterceptor = apiClient.interceptors.request.handlers[0].fulfilled;

const initialDemoState = useDemoStore.getInitialState();

const clearCookies = () => {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    }
  });
};

beforeEach(() => {
  useDemoStore.setState(initialDemoState, true);
  clearCookies();
});

afterEach(() => {
  clearCookies();
  vi.restoreAllMocks();
});

describe('demoClient interceptor', () => {
  it('rewrites a demo-eligible URL to /demo/scenarios/{demoId}/... when demoId and a matching prefix are set', () => {
    useDemoStore.setState({
      demoId: 'baseline',
      routePrefixes: ['/inputs/', '/canvas/'],
    });

    const config = demoInterceptor({ url: '/inputs/all-inputs', headers: {} });

    expect(config.url).toBe('/demo/scenarios/baseline/inputs/all-inputs');
  });

  it('URL-encodes the demoId when rewriting', () => {
    useDemoStore.setState({ demoId: 'a demo/id', routePrefixes: ['/inputs/'] });

    const config = demoInterceptor({ url: '/inputs/all-inputs', headers: {} });

    expect(config.url).toBe('/demo/scenarios/a%20demo%2Fid/inputs/all-inputs');
  });

  it('leaves a non-matching URL untouched, even with an active demoId', () => {
    // Regression case: the old interceptor keyed off a bare '/api/' prefix,
    // which wrongly rewrote every api-router route including /project/*.
    // routePrefixes is the backend-derived allowlist that replaced it.
    useDemoStore.setState({
      demoId: 'baseline',
      routePrefixes: ['/inputs/', '/canvas/'],
    });

    const config = demoInterceptor({ url: '/project/', headers: {} });

    expect(config.url).toBe('/project/');
  });

  it('does not rewrite when routePrefixes is empty (bootstrap has not returned yet)', () => {
    useDemoStore.setState({ demoId: 'baseline', routePrefixes: [] });

    const config = demoInterceptor({ url: '/inputs/all-inputs', headers: {} });

    expect(config.url).toBe('/inputs/all-inputs');
  });

  it('does not rewrite when there is no active demoId', () => {
    useDemoStore.setState({ demoId: null, routePrefixes: ['/inputs/'] });

    const config = demoInterceptor({ url: '/inputs/all-inputs', headers: {} });

    expect(config.url).toBe('/inputs/all-inputs');
  });

  it('strips every X-CEA-* scenario header, matched request or not', () => {
    useDemoStore.setState({ demoId: null, routePrefixes: [] });

    const config = demoInterceptor({
      url: '/project/',
      headers: {
        [PROJECT_HEADER]: 'some-project',
        [SCENARIO_NAME_HEADER]: 'baseline',
        [CHILD_SCENARIO_HEADER]: 'pathway/2030',
        'Content-Type': 'application/json',
      },
    });

    expect(config.headers).not.toHaveProperty(PROJECT_HEADER);
    expect(config.headers).not.toHaveProperty(SCENARIO_NAME_HEADER);
    expect(config.headers).not.toHaveProperty(CHILD_SCENARIO_HEADER);
    expect(config.headers['Content-Type']).toBe('application/json');
  });
});

describe('session refresh URL', () => {
  // Regression check for the exact string this migration changed: the
  // refresh call bypasses both clients' baseURL config (bare axios.post), so
  // it's the one place a stray '/api' prefix could silently come back.
  const buildAccessToken = (exp) =>
    `header.${btoa(JSON.stringify({ exp }))}.signature`;

  it('apiClient refreshes against {VITE_CEA_URL}/user/session/refresh, no /api prefix', async () => {
    const expiredToken = buildAccessToken(Math.floor(Date.now() / 1000)); // already expired
    document.cookie = `stack-access=${encodeURIComponent(
      JSON.stringify(['refresh-token', expiredToken]),
    )}`;

    const postSpy = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { access_token: 'new-token' } });

    await apiAuthInterceptor({ headers: {} });

    expect(postSpy).toHaveBeenCalledWith(
      'http://backend.test/user/session/refresh',
      {},
      { withCredentials: true },
    );
  });
});

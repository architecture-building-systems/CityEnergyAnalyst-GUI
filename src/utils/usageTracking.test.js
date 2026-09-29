import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isJobFinishedState, trackJobFinished } from './usageTracking';

describe('usageTracking', () => {
  const capture = vi.fn();

  beforeEach(() => {
    capture.mockReset();
    window.posthog = { capture };
  });

  it('treats only final states as finished', () => {
    expect([0, 1].some(isJobFinishedState)).toBe(false);
    expect([2, 3, 4, 5].every(isJobFinishedState)).toBe(true);
  });

  it('tracks a completed job with script, duration and platform only', () => {
    trackJobFinished({
      id: 'abc',
      script: 'demand',
      state: 2,
      duration: 12.5,
      parameters: { scenario: '/home/bob/project/base' },
      scenario_name: 'base',
    });
    expect(capture).toHaveBeenCalledWith('job_finished', {
      script: 'demand',
      outcome: 'completed',
      duration_seconds: 12.5,
      platform: 'web',
    });
  });

  it('derives duration from timestamps when not provided', () => {
    trackJobFinished({
      script: 'demand',
      state: 4,
      start_time: '2026-01-01T00:00:00Z',
      end_time: '2026-01-01T00:00:30Z',
    });
    expect(capture.mock.calls[0][1]).toMatchObject({
      outcome: 'canceled',
      duration_seconds: 30,
    });
  });

  it('includes a path-redacted first error line for failed jobs', () => {
    trackJobFinished({
      script: 'emissions',
      state: 3,
      error: 'Column X not found in C:\\Users\\bob\\grid.csv\nTraceback...',
    });
    expect(capture.mock.calls[0][1]).toMatchObject({
      outcome: 'failed',
      error: 'Column X not found in <path>',
    });
  });

  it('ignores non-final states and survives a missing PostHog', () => {
    trackJobFinished({ script: 'demand', state: 1 });
    expect(capture).not.toHaveBeenCalled();
    delete window.posthog;
    expect(() =>
      trackJobFinished({ script: 'demand', state: 2 }),
    ).not.toThrow();
  });
});

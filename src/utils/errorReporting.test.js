import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reportError, reportJobFailure } from './errorReporting';

describe('errorReporting', () => {
  const capture = vi.fn();

  beforeEach(() => {
    capture.mockReset();
    window.posthog = { capture };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('forwards errors to PostHog as ui_error', () => {
    reportError(new Error('boom-1'), { area: 'test' });
    expect(capture).toHaveBeenCalledWith(
      'ui_error',
      expect.objectContaining({ message: 'boom-1', area: 'test' }),
    );
  });

  it('sends the same error only once within the dedupe window', () => {
    const make = () => new Error('boom-2');
    const error = make();
    reportError(error);
    reportError(error);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('does not throw when PostHog is absent', () => {
    delete window.posthog;
    expect(() => reportError(new Error('boom-3'))).not.toThrow();
  });

  it('reports job failures with script name and path-redacted message', () => {
    reportJobFailure({
      id: 1,
      script: 'emissions',
      error: 'Column X not found in C:\\Users\\bob\\grid.csv\nTraceback...',
    });
    expect(capture).toHaveBeenCalledWith('job_failed', {
      script: 'emissions',
      message: 'Column X not found in <path>',
    });
  });
});

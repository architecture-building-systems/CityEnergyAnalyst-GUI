import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reportError } from './errorReporting';

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
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redactStack, reportError } from './errorReporting';

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

  it('redacts paths in the message but keeps stack file names and line numbers', () => {
    const error = new Error('cannot read /Users/bob/data.csv');
    error.stack = 'Error: x\n    at Ke (https://host/assets/App-1a2b.js:1:2)';
    reportError(error, {
      componentStack: '\n    at div (file:///Users/bob/app/x.js:3:4)',
    });
    const properties = capture.mock.calls[0][1];
    expect(properties.message).toBe('cannot read <path>');
    expect(properties.stack).toContain('(App-1a2b.js:1:2)');
    expect(properties.stack).not.toContain('host');
    expect(properties.componentStack).toContain('(x.js:3:4)');
    expect(properties.componentStack).not.toContain('bob');
  });

  it('redactStack leaves path-free tokens alone', () => {
    expect(redactStack('at div (<anonymous>)')).toBe('at div (<anonymous>)');
  });
});

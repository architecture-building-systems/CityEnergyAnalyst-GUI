import { Result } from 'antd';
import { isElectron, openExternal } from '../utils/electron';

/**
 * Flatten an error into the three things this component renders.
 *
 * Two shapes arrive here: a raw axios error (body at `error.response.data`) and an
 * already-normalised response (body at `error.data`). Handling both means a call site that
 * forgets to normalise still shows the real reason instead of "UNKNOWN ERROR".
 *
 * FastAPI's `detail` is a string for a plain `HTTPException` and an object when the route
 * carries structure with it, so both are unwrapped -- rendering `detail` straight would put an
 * object where React expects a node. Routes that reject for several reasons at once send them
 * in `detail.problems`, so the user can fix everything in one pass rather than one failed
 * save at a time.
 */
const parseError = (error) => {
  const body = error?.response?.data ?? error?.data ?? null;
  const detail = body?.detail;

  return {
    message:
      body?.message ||
      (typeof detail === 'string' ? detail : detail?.message) ||
      error?.message ||
      'UNKNOWN ERROR',
    problems: Array.isArray(detail?.problems)
      ? detail.problems.filter((problem) => typeof problem === 'string')
      : [],
    trace: body?.trace,
  };
};

// TODO: Find way to show error log
export function AsyncError({ title = 'Something went wrong', error }) {
  const { message, problems, trace } = parseError(error);

  return (
    <Result
      status="error"
      title={title}
      subTitle={
        <div>
          <p>
            You may submit {isElectron() && 'the contents of the log file and '}
            the error details as an issue on our GitHub{' '}
            <span
              aria-hidden
              style={{
                cursor: 'pointer',
                color: 'blue',
                textDecoration: 'underline',
              }}
              onClick={() => {
                const url =
                  'https://github.com/architecture-building-systems/CityEnergyAnalyst/issues/new?assignees=&labels=bug&template=bug_report.md&title=';
                if (isElectron()) openExternal(url);
                else window.open(url, '_blank', 'noreferrer');
              }}
            >
              here
            </span>
            .
          </p>
        </div>
      }
    >
      <div>
        <h3>Error Message:</h3>
        <p style={{ fontFamily: 'monospace' }}>{message}</p>
        {problems.length > 0 && (
          <ul style={{ fontFamily: 'monospace', paddingInlineStart: 20 }}>
            {/* Index keys: a fixed list rendered once, never reordered, and two problems can
                legitimately read the same. */}
            {problems.map((problem, index) => (
              <li key={index} style={{ marginBottom: 4 }}>
                {problem}
              </li>
            ))}
          </ul>
        )}
        {trace && (
          <details style={{ cursor: 'pointer' }}>
            <pre
              style={{
                margin: 12,
                padding: 16,
                cursor: 'auto',
                border: '1px solid #ccc',
                borderRadius: 16,
                background: 'white',
                maxHeight: 500,
                overflow: 'auto',
              }}
            >
              {trace}
            </pre>
          </details>
        )}
      </div>
    </Result>
  );
}

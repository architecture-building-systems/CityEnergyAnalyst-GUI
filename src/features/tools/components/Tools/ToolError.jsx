import { Alert } from 'antd';

const parseError = (error) => {
  if (!error) return null;
  if (typeof error === 'string') return { message: error, fieldErrors: null };
  if (typeof error === 'object') {
    if (error.detail) return parseError(error.detail);
    return {
      message: error.message || 'An unexpected error occurred.',
      fieldErrors: error.field_errors || null,
    };
  }
  return { message: 'An unexpected error occurred.', fieldErrors: null };
};

export const ToolError = ({ title, error }) => {
  const parsed = parseError(error);
  if (!parsed) return null;

  const { message, fieldErrors } = parsed;

  const description = fieldErrors ? (
    <ul style={{ margin: 0, paddingLeft: 16 }}>
      {Object.entries(fieldErrors).map(([field, msg]) => (
        <li key={field}>
          <b>{field}</b>: {msg}
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <Alert
      className="cea-tool-error animate-fade-in"
      title={title || message}
      description={description}
      type="error"
    />
  );
};

import { Input } from 'antd';

export const DatasetForm = ({ data }) => {
  if (data == null) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: 1,
        margin: 12,
      }}
    >
      {Object.keys(data).map((key) => (
        <div key={key} style={{ display: 'flex', gap: 12 }}>
          <small style={{ flex: 12 }}>
            <b>{key}</b>
          </small>
          {key == 'description' ? (
            <small style={{ flex: 12 }}>{data[key]}</small>
          ) : (
            <Input style={{ flex: 12 }} value={data[key]} />
          )}
        </div>
      ))}
    </div>
  );
};

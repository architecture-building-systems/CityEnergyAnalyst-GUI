import { Button, Input } from 'antd';
import { useState } from 'react';

const CodeForm = ({ data }) => {
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

export const CodeDataset = ({ data }) => {
  const [code, setCode] = useState(null);

  if (data == null) return <div>No data selected.</div>;

  return (
    <div
      className="cea-database-editor-database-dataset-code"
      style={{ display: 'flex', gap: 12 }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <small>code</small>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.keys(data).map((index) => {
            return (
              <Button
                key={index}
                onClick={() => setCode(index)}
                type={code == index ? 'primary' : 'default'}
              >
                {index}
              </Button>
            );
          })}
        </div>
      </div>

      {code != null && <CodeForm data={data?.[code]} />}
    </div>
  );
};

import { Button } from 'antd';
import { useState } from 'react';
import { DatasetForm } from './dataset-form';

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
        <div
          className="cea-database-editor-database-dataset-code-buttons"
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
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

      {code != null && <DatasetForm data={data?.[code]} />}
    </div>
  );
};

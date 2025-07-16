import { useMemo, useState } from 'react';
import { Tabs } from 'antd';
import Table from 'features/input-editor/components/InputEditor/Table';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';

const InputTable = () => {
  const { data } = useInputs();
  const { tables, columns } = data;

  const [tab, setTab] = useState('zone');
  const tabItems = useMemo(() => {
    if (typeof tables == 'undefined') return null;

    return [...Object.keys(tables), 'schedules'].map((key) => ({
      key: key,
      label: key,
    }));
  }, [tables]);

  if (typeof tables == 'undefined') return null;

  return (
    <div
      className="cea-input-editor"
      style={{ height: '100%', padding: '0 12px', background: '#fff' }}
    >
      <Tabs
        className="cea-input-editor-tabs"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: '#fff',
          paddingTop: 12,
        }}
        size="small"
        type="card"
        activeKey={tab}
        onChange={setTab}
        animated={false}
        items={tabItems}
      />
      <div
        className="cea-input-editor-table"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '0 12px',
          background: '#fff',
          paddingBottom: 12,
        }}
      >
        <Table tab={tab} tables={tables} columns={columns} />
      </div>
    </div>
  );
};

export default InputTable;

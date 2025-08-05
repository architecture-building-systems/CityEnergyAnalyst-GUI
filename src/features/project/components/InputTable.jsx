import { useMemo, useState } from 'react';
import { Button, Tabs } from 'antd';
import Table from 'features/input-editor/components/InputEditor/Table';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import { VerticalLeftOutlined } from '@ant-design/icons';

const InputTable = ({ onClose }) => {
  const { data } = useInputs();
  const { tables, columns } = data;

  const [tab, setTab] = useState('zone');
  const tabItems = useMemo(() => {
    if (typeof tables == 'undefined') return null;

    return Object.keys(tables).map((key) => ({
      key: key,
      label: key,
    }));
  }, [tables]);

  if (typeof tables == 'undefined') return null;

  return (
    <div
      className="cea-input-editor"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Tabs
        className="cea-input-editor-tabs"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          paddingTop: 12,
        }}
        size="small"
        type="card"
        activeKey={tab}
        onChange={setTab}
        animated={false}
        items={tabItems}
        tabBarExtraContent={
          <div style={{ marginBottom: 12 }}>
            <Button
              icon={<VerticalLeftOutlined rotate={90} />}
              onClick={onClose}
              style={{ marginLeft: 'auto', padding: 12 }}
              size="small"
              title="Minimize"
            />
          </div>
        }
      />
      <div
        className="cea-input-editor-table"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingInline: 12,
          paddingBottom: 12,

          minHeight: 0,
        }}
      >
        <Table tab={tab} tables={tables} columns={columns} />
      </div>
    </div>
  );
};

export default InputTable;

import { useMemo, useState } from 'react';
import { Button, Tabs } from 'antd';
import Table from 'features/input-editor/components/InputEditor/Table';
import ArchetypeLockToggle from 'features/input-editor/components/ArchetypeLockToggle';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import {
  useArchetypeLock,
  useSetArchetypeLock,
} from 'features/input-editor/hooks/queries/useArchetypeLock';
import { VerticalLeftOutlined } from '@ant-design/icons';

const InputTable = ({ onClose }) => {
  const { data } = useInputs();
  const { tables, columns } = data;
  const { data: lock } = useArchetypeLock();
  const setLock = useSetArchetypeLock();

  const [tab, setTab] = useState('zone');

  // While locked, CEA owns the archetype-derived tables. Rendering them read-only is only the
  // affordance; `save_all_inputs` refuses to write them regardless of what the client sends.
  const readOnly = lock.locked && lock.derived_tabs.includes(tab);
  // Once the derived tables no longer match, the archetype columns no longer describe the
  // building they label -- so mark them where the user chose them.
  const driftedColumns =
    !lock.locked && lock.drifted && tab === 'zone' ? lock.archetype_key_columns : [];
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
      style={{
        boxSizing: 'border-box',
        padding: 12,

        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
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
          <div
            style={{
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <ArchetypeLockToggle
              locked={lock.locked}
              buildingCount={Object.keys(tables?.zone ?? {}).length}
              onChanged={(next) => setLock.mutateAsync(next)}
            />
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
        <Table
          tab={tab}
          tables={tables}
          columns={columns}
          readOnly={readOnly}
          driftedColumns={driftedColumns}
        />
      </div>
    </div>
  );
};

export default InputTable;

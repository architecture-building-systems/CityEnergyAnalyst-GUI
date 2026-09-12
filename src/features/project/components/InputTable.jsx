import { useMemo, useState } from 'react';
import { Alert, Button, Tabs } from 'antd';
import Table from 'features/input-editor/components/InputEditor/Table';
import {
  NO_GEOMETRY_FIX_MANY,
  NO_GEOMETRY_FIX_ONE,
  NO_GEOMETRY_REASON,
} from 'features/input-editor/constants';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import { VerticalLeftOutlined } from '@ant-design/icons';

const InputTable = ({ onClose }) => {
  const { data } = useInputs();
  const { tables, columns } = data;

  const [tab, setTab] = useState('zone');

  // Rows the map cannot draw: present in the table, absent from the geometry. The server skips
  // rows with a null footprint when it builds the geojson -- one such row used to blank the
  // whole map -- so the difference between the two is exactly the set with no geometry. No
  // extra request needed; the editor already holds both halves.
  const rowsWithoutGeometry = useMemo(() => {
    const features = data?.geojsons?.[tab]?.features;
    if (!features || !tables?.[tab]) return [];
    const drawn = new Set(features.map((feature) => feature?.properties?.name));
    return Object.keys(tables[tab]).filter((name) => !drawn.has(name));
  }, [data?.geojsons, tables, tab]);

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
        {rowsWithoutGeometry.length > 0 && (
          // Visible without having to suspect anything is wrong. The row tint and its hover
          // text explain the individual row; this says the map is incomplete at all, which is
          // the part a user cannot otherwise tell -- a building missing from the map looks the
          // same as a building that was never there.
          <Alert
            type="warning"
            showIcon
            banner
            message={
              rowsWithoutGeometry.length === 1 ? (
                <>
                  <b>{rowsWithoutGeometry[0]}</b> {NO_GEOMETRY_REASON}{' '}
                  {NO_GEOMETRY_FIX_ONE}
                </>
              ) : (
                <>
                  {rowsWithoutGeometry.length} rows have no footprint, so they are not drawn on
                  the map: <b>{rowsWithoutGeometry.join(', ')}</b>. {NO_GEOMETRY_FIX_MANY}
                </>
              )
            }
          />
        )}
        <Table
          tab={tab}
          tables={tables}
          columns={columns}
          rowsWithoutGeometry={rowsWithoutGeometry}
        />
      </div>
    </div>
  );
};

export default InputTable;

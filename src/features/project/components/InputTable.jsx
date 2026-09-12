import { useMemo, useState } from 'react';
import { Tabs } from 'antd';
import Table from 'features/input-editor/components/InputEditor/Table';
import ArchetypeLockToggle from 'features/input-editor/components/ArchetypeLockToggle';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import {
  useArchetypeLock,
  useSetArchetypeLock,
} from 'features/input-editor/hooks/queries/useArchetypeLock';

const InputTable = ({ onFitHeightChange }) => {
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
    !lock.locked && lock.drifted && tab === 'zone'
      ? lock.archetype_key_columns
      : [];
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

        // `flex: 1` rather than `height: 100%`: the card is a fixed-height flex column that also
        // holds the 18px resize handle, so 100% would overshoot by the handle's height and get
        // clipped by the card's `overflow: hidden`. `minHeight: 0` lets the table scroll instead
        // of forcing the column taller than the card.
        flex: 1,
        minHeight: 0,
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

          // Absorbs whatever the tab bar leaves, so the table tracks the dragged card height.
          flex: 1,
          minHeight: 0,
        }}
      >
        <Table
          tab={tab}
          tables={tables}
          columns={columns}
          readOnly={readOnly}
          driftedColumns={driftedColumns}
          rowsWithoutGeometry={rowsWithoutGeometry}
          onFitHeightChange={onFitHeightChange}
        />
      </div>
    </div>
  );
};

export default InputTable;

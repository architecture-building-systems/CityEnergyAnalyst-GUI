import { useMemo, useState } from 'react';
import { Alert, Tabs } from 'antd';
import Table from 'features/input-editor/components/InputEditor/Table';
import ArchetypeLockToggle from 'features/input-editor/components/ArchetypeLockToggle';
import HiddenInDemo from 'components/HiddenInDemo';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import {
  useArchetypeLock,
  useSetArchetypeLock,
} from 'features/input-editor/hooks/queries/useArchetypeLock';
import { useConstructionTypes } from 'features/input-editor/hooks/queries/useConstructionTypes';
import { useArchetypeDrift } from 'features/input-editor/hooks/useArchetypeDrift';
import { useChangesExist } from 'features/input-editor/stores/inputEditorStore';
import { useDemoMode } from 'stores/demoStore';

const InputTable = ({ onFitHeightChange }) => {
  const { data } = useInputs();
  const { tables, columns } = data;
  const { data: lock, isFetching: lockIsFetching } = useArchetypeLock();
  const setLock = useSetArchetypeLock();
  const { data: constructionTypes } = useConstructionTypes();
  const demoMode = useDemoMode();
  // Toggling the lock either regenerates every derived table (locking) or hands them to the
  // user as-is (unlocking) -- both read straight from the saved scenario on disk, not from any
  // unsaved edit sitting in the store. Doing that with unsaved edits in flight would either
  // discard them silently (locking) or leave the client showing values the next fetch won't
  // agree with (unlocking), so the toggle stays disabled until the user saves or discards first.
  const hasPendingChanges = useChangesExist();

  const [tab, setTab] = useState('zone');

  // While locked, CEA owns the archetype-derived tables. Rendering them read-only is only the
  // affordance; `save_all_inputs` refuses to write them regardless of what the client sends.
  // Demo visitors have no write path at all (the demo sub-app defines no PUT route), so the
  // whole editor is read-only there, not just the archetype-derived tabs.
  // `lockIsFetching`/`setLock.isPending` cover the window where `lock` (and the `inputs` cache
  // `useUpdateInputs` writes edits straight into) is about to change under the editor: an edit
  // made mid-toggle would otherwise get silently replaced once the lock/inputs refetch lands --
  // see `useSetArchetypeLock`'s `onSuccess`, which now awaits both invalidations rather than
  // letting `mutateAsync` resolve (and this gate lift) before they land.
  const readOnly =
    demoMode ||
    lockIsFetching ||
    setLock.isPending ||
    (lock.locked && lock.derived_tabs.includes(tab));
  // The real, per-building, per-tab check: does this building's data in *this* tab still match
  // what its current archetype implies? Computed entirely from data already loaded above -- no
  // extra request beyond `useConstructionTypes`, which the input editor did not previously fetch.
  // Each entry is `true` (highlight the whole row -- the two computed tabs) or a `Set` of the
  // specific columns that disagree (the three lookup tabs) -- see `useArchetypeDrift`'s docstring
  // for why the two kinds of tab can't share one granularity.
  const drift = useArchetypeDrift({ tables, lock, constructionTypes });
  const driftedCells = useMemo(
    () => (!lock.locked ? (drift[tab] ?? {}) : {}),
    [drift, tab, lock.locked],
  );
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
            <HiddenInDemo>
              <ArchetypeLockToggle
                locked={lock.locked}
                derivedTabs={lock.derived_tabs}
                buildingCount={Object.keys(tables?.zone ?? {}).length}
                onChanged={(next) => setLock.mutateAsync(next)}
                disabled={
                  hasPendingChanges || lockIsFetching || setLock.isPending
                }
              />
            </HiddenInDemo>
            {demoMode && (
              <Alert type="info" showIcon message="Read-only demo scenario" />
            )}
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
          locked={lock.locked}
          driftedCells={driftedCells}
          rowsWithoutGeometry={rowsWithoutGeometry}
          onFitHeightChange={onFitHeightChange}
        />
      </div>
    </div>
  );
};

export default InputTable;

import { useMemo, useState } from 'react';
import { Button, Modal, Tooltip } from 'antd';
import { BinAnimationIcon, DuplicateIcon, InputEditorIcon } from 'assets/icons';
import { ERROR_RED } from 'constants/theme';
import EditSelectedModal from 'features/input-editor/components/InputEditor/EditSelectedModal';
import 'tabulator-tables/dist/css/tabulator.min.css';

import { INDEX_COLUMN } from 'features/input-editor/constants';

// Grey fillet outline for the text actions. Wider horizontal padding than antd's default so
// they read as a toolbar group rather than as cramped buttons. Corner radius is left to antd's
// `borderRadius` token (6), the same radius the overview-card buttons get -- the 12px used
// elsewhere is a *card* radius and reads as far too round on a button this size.
const outlineButtonStyle = {
  padding: '0 16px',
  borderColor: '#e8e8e8',
  // Height is deliberately left to antd's `controlHeight` token (32), which is what the pathway
  // card's text buttons use. That leaves them shorter than the 38px icon-button containers
  // alongside; they are centred, and matching the other text buttons in the app won out over
  // matching the icons in this one row.
};
import {
  useDeleteBuildings,
  useDuplicateBuilding,
} from 'features/input-editor/hooks/updates/useUpdateInputs';
import DuplicateBuildingModal from 'features/input-editor/components/DuplicateBuildingModal';

export const TableButtons = ({
  selected,
  tabulator,
  tables,
  tab,
  columns,
  setSelected,
  readOnly = false,
  locked = false,
  rowsWithoutGeometry = [],
}) => {
  const deleteBuildings = useDeleteBuildings();
  const duplicateBuilding = useDuplicateBuilding();

  const [filterToggle, setFilterToggle] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [duplicateVisible, setDuplicateVisible] = useState(false);

  const currentTableIndexes = useMemo(
    () => Object.keys(tables?.[tab] || {}),
    [tables, tab],
  );
  const selectedInTable = useMemo(() => {
    return selected.length > 0 && currentTableIndexes.includes(selected[0]);
  }, [currentTableIndexes, selected]);

  const selectAll = () => {
    setSelected(tabulator.current.getData().map((data) => data[INDEX_COLUMN]));
  };

  // `setFilter(INDEX_COLUMN, 'in', [])` matches nothing, so filtering with an empty selection
  // blanks the table with no way back except the same button. Harmless while this lived in a
  // dropdown; as a permanent toolbar button it needs the guard.
  const filterSelected = () => {
    if (filterToggle) {
      tabulator.current.clearFilter();
    } else {
      tabulator.current.setFilter(INDEX_COLUMN, 'in', selected);
    }
    tabulator.current.redraw();
    setFilterToggle((oldValue) => !oldValue);
  };

  const clearSelected = () => {
    setSelected([]);
  };

  const deleteSelected = () => {
    Modal.confirm({
      title: `Are you sure delete these ${tab == 'trees' ? 'trees ' : 'buildings'}?`,
      content: (
        <div>
          <i style={{ fontSize: '1vw' }}>
            This will delete the following{' '}
            {tab == 'trees' ? 'trees ' : 'buildings'} from every table:
          </i>
          <div style={{ overflow: 'auto', maxHeight: 200, margin: 10 }}>
            {selected.join(', ')}
          </div>
        </div>
      ),
      centered: true,
      okText: 'DELETE',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        deleteBuildings([...selected]);
      },
    });
  };

  const editSelected = () => {
    setModalVisible(true);
  };

  const duplicateSelected = (newName) => {
    const created = duplicateBuilding(selected[0], newName);
    // Leave the user on the copy rather than the original -- it is the row they just made and
    // the one they are most likely to edit next.
    if (created) setSelected([created]);
  };

  // Duplicating only makes sense on `zone` -- every other tab is derived from it. One at a
  // time, like the overview card's Duplicate Scenario, because the dialog names the copy.
  const canDuplicate =
    tab === 'zone' && selectedInTable && selected.length === 1;

  // Copying a building with no footprint would only produce a second footprint-less building,
  // and the editor cannot draw one for either of them.
  const selectionHasNoGeometry = rowsWithoutGeometry.includes(selected[0]);

  // A new building's envelope, HVAC, comfort, loads and supply rows come from the server's
  // re-map of `buildings_added`, which only runs while locked. Unlocked, the copy would have no
  // derived rows at all. Disabled rather than hidden, so the tooltip can say why.
  const duplicateBlockedBecause = selectionHasNoGeometry
    ? 'This building has no footprint, so there is nothing to copy. Give it a geometry or delete the row.'
    : !locked
      ? "Turn on Archetype Lock to duplicate: CEA generates the new building's archetype tables on save."
      : null;

  return (
    <>
      <Button style={outlineButtonStyle} onClick={selectAll}>
        Select All
      </Button>
      <Button
        style={outlineButtonStyle}
        onClick={filterSelected}
        disabled={!filterToggle && selected.length === 0}
      >
        {filterToggle ? 'Clear Filter' : 'Filter on Selection'}
      </Button>
      {selectedInTable && (
        <Button style={outlineButtonStyle} onClick={clearSelected}>
          Clear Selection
        </Button>
      )}
      {canDuplicate && (
        // Matches the overview card's Duplicate Scenario button
        // (`ScenarioRow.jsx :: DuplicateScenarioIcon`): same icon, same `type="text"` button in
        // the same container, same name-it-first dialog.
        <div className="cea-card-icon-button-container">
          <Tooltip
            title={duplicateBlockedBecause ?? 'Duplicate Building'}
            placement="bottom"
          >
            {/* `span` wrapper: antd tooltips do not fire on a disabled button, which is the one
                state where this tooltip has something to say. */}
            <span>
              <Button
                type="text"
                icon={<DuplicateIcon />}
                onClick={() => setDuplicateVisible(true)}
                disabled={duplicateBlockedBecause !== null}
                aria-label="Duplicate Building"
              />
            </span>
          </Tooltip>
        </div>
      )}
      {/* `cea-card-icon-button-container` (HomePage.css) is the shared icon-button chrome used
          by the overview card, the pathway panel and the canvas cards: 12px fillet, 1px #ddd
          outline, 30x30 `type="text"` button inside. One container per button, so each reads as
          its own action. The container draws the outline, so the buttons stay borderless. Both
          are absent rather than disabled without a selection, so the row actions only appear
          once they mean something.

          Bulk edit writes into the same change set as cell editing, so it has to respect the
          lock too -- otherwise a locked tab looks editable through this route, and the edit is
          silently dropped by the server on save. `schedules` has no bulk editor. */}
      {selectedInTable && tab != 'schedules' && (
        <div className="cea-card-icon-button-container">
          <Tooltip title="Edit Selection" placement="bottom">
            <Button
              type="text"
              icon={<InputEditorIcon />}
              onClick={editSelected}
              disabled={readOnly}
              aria-label="Edit Selection"
            />
          </Tooltip>
        </div>
      )}
      {selectedInTable && (
        <div className="cea-card-icon-button-container">
          <Tooltip title="Delete Selection" placement="bottom">
            <Button
              type="text"
              // Explicit colour because antd's `.ant-btn .ant-btn-icon > svg { color: inherit }`
              // outranks the SVG's own fill and would grey the bin out. Same reason every other
              // `BinAnimationIcon` call site sets it inline.
              icon={<BinAnimationIcon style={{ color: ERROR_RED }} />}
              onClick={deleteSelected}
              // Rows in a derived table are regenerated from zone.shp, so deleting one there is
              // meaningless while locked. Delete the building from the zone tab instead.
              disabled={readOnly}
              aria-label="Delete Selection"
            />
          </Tooltip>
        </div>
      )}

      <DuplicateBuildingModal
        visible={duplicateVisible}
        setVisible={setDuplicateVisible}
        building={selected[0]}
        existingNames={currentTableIndexes}
        onDuplicate={duplicateSelected}
      />
      <EditSelectedModal
        visible={modalVisible}
        setVisible={setModalVisible}
        inputTable={tabulator.current}
        table={tab}
        columns={columns}
      />
    </>
  );
};

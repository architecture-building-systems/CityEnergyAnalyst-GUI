import { useMemo, useState } from 'react';
import { Button, Modal, Tooltip } from 'antd';
import { BinAnimationIcon, InputEditorIcon } from 'assets/icons';
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
import { useDeleteBuildings } from 'features/input-editor/hooks/updates/useUpdateInputs';

export const TableButtons = ({
  selected,
  tabulator,
  tables,
  tab,
  columns,
  setSelected,
  readOnly = false,
}) => {
  const deleteBuildings = useDeleteBuildings();

  const [filterToggle, setFilterToggle] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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

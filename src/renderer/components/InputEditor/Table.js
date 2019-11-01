import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { Card, Button, Modal } from 'antd';
import {
  setSelected,
  updateInputData,
  deleteBuildings,
  discardChanges
} from '../../actions/inputEditor';
import EditSelectedModal from './EditSelectedModal';
import routes from '../../constants/routes';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';

const useTableData = tab => {
  const tables = useSelector(state => state.inputData.tables);
  const columns = useSelector(state => state.inputData.columns);

  const [data, setData] = useState([]);
  const [columnDef, setColumnDef] = useState([]);

  const dispatch = useDispatch();

  const selectRow = (e, cell) => {
    const row = cell.getRow();
    const selectedRows = cell
      .getTable()
      .getSelectedData()
      .map(data => data.Name);
    if (cell.getRow().isSelected()) {
      dispatch(
        setSelected(selectedRows.filter(name => name !== row.getIndex()))
      );
    } else {
      dispatch(setSelected([...selectedRows, row.getIndex()]));
    }
  };

  const getData = () =>
    Object.keys(tables[tab]).map(row => ({
      Name: row,
      ...tables[tab][row]
    }));

  const getColumnDef = () =>
    Object.keys(columns[tab]).map(column => {
      let columnDef = { title: column, field: column };
      if (column === 'Name') {
        columnDef.frozen = true;
        columnDef.cellClick = selectRow;
      } else if (column !== 'REFERENCE') {
        columnDef.editor = 'input';
        columnDef.validator =
          columns[tab][column].type === 'str' ? 'string' : 'numeric';
        columnDef.minWidth = 100;
        // Hack to allow editing when double clicking
        columnDef.cellDblClick = () => {};
      }
      return columnDef;
    });

  useEffect(() => {
    setColumnDef(getColumnDef());
    setData(getData());
  }, [tab]);

  useEffect(() => {
    setData(getData());
  }, [tables[tab]]);

  return [data, columnDef];
};

const Table = ({ tab }) => {
  const [data, columnDef] = useTableData(tab);
  const { selected, changes } = useSelector(state => state.inputData);
  const noChanges =
    !Object.keys(changes.update).length && !Object.keys(changes.delete).length;
  const dispatch = useDispatch();
  const tableRef = useRef(tab);
  const tabulator = useRef(null);
  const divRef = useRef(null);

  useEffect(() => {
    tabulator.current = new Tabulator(divRef.current, {
      data: data,
      index: 'Name',
      columns: columnDef,
      layout: 'fitDataFill',
      height: '300px',
      validationFailed: cell => {
        cell.cancelEdit();
      },
      cellEdited: cell => {
        dispatch(
          updateInputData(
            tableRef.current,
            [cell.getData()['Name']],
            [{ property: cell.getField(), value: cell.getValue() }]
          )
        );
      },
      placeholder: '<div>No matching records found.</div>'
    });
  }, []);

  // Keep reference of current table name
  useEffect(() => {
    tableRef.current = tab;
  }, [tab]);

  useEffect(() => {
    if (tabulator.current) {
      tabulator.current.setData([]);
      tabulator.current.setColumns(columnDef);
      tabulator.current.setSort('Name', 'asc');
    }
  }, [columnDef]);

  useEffect(() => {
    if (tabulator.current) {
      if (!tabulator.current.getData().length) {
        tabulator.current.setData(data);
        tabulator.current.selectRow(selected);
      } else tabulator.current.updateData(data);
    }
  }, [data]);

  useEffect(() => {
    if (tabulator.current) {
      tabulator.current.deselectRow();
      tabulator.current.selectRow(selected);
      tabulator.current.getFilters().length &&
        tabulator.current.setFilter('Name', 'in', selected);
    }
  }, [selected]);

  const saveChanges = () => {
    Modal.confirm({
      title: 'Save these changes?',
      content: (
        <details>
          <summary>Show changes</summary>
          <ChangesSummary changes={changes} />
        </details>
      ),
      centered: true,
      okText: 'SAVE',
      okType: 'primary',
      cancelText: 'Cancel',
      async onOk() {
        // eslint-disable-next-line no-undef
        // await new Promise(resolve => dispatch(discardChanges(() => resolve())));
      }
    });
  };

  const _discardChanges = () => {
    Modal.confirm({
      title: 'This will discard all unsaved changes.',
      content: (
        <details>
          <summary>Show changes</summary>
          <ChangesSummary changes={changes} />
        </details>
      ),
      centered: true,
      okText: 'DISCARD',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        // eslint-disable-next-line no-undef
        await new Promise(resolve => dispatch(discardChanges(() => resolve())));
      }
    });
  };

  return (
    <React.Fragment>
      <Card
        headStyle={{ backgroundColor: '#f1f1f1' }}
        size="small"
        extra={
          <TableButtons selected={selected} tabulator={tabulator} table={tab} />
        }
      >
        <div ref={divRef} style={{ display: data.length ? 'block' : 'none' }} />
        {!data.length ? (
          <div>
            Input file could not be found. You can create the file using the
            <Link to={`${routes.TOOLS}/data-helper`}>{' data-helper '}</Link>
            tool.
          </div>
        ) : null}
      </Card>
      <Button style={{ margin: 5 }} disabled={noChanges} onClick={saveChanges}>
        Save
      </Button>
      <Button
        style={{ margin: 5 }}
        type="danger"
        disabled={noChanges}
        onClick={_discardChanges}
      >
        Discard Changes
      </Button>
    </React.Fragment>
  );
};

const ChangesSummary = ({ changes }) => {
  return (
    <div style={{ overflow: 'auto', maxHeight: 400 }}>
      {Object.keys(changes.delete).length ? (
        <div>
          <b>DELETE:</b>
          {Object.keys(changes.delete).map(table => (
            <div key={table}>
              <u>
                <b>{table}</b>
              </u>
              <div>
                {changes.delete[table].reduce(
                  (out, building) => `${out}, ${building}`
                )}
              </div>
              <br />
            </div>
          ))}
        </div>
      ) : null}
      {Object.keys(changes.update).length ? (
        <div>
          <b>UPDATE:</b>
          {Object.keys(changes.update).map(table => (
            <div key={table}>
              <u>
                <b>{table}</b>
              </u>
              {Object.keys(changes.update[table]).map(building => (
                <div key={building}>
                  {building}
                  {Object.keys(changes.update[table][building]).map(
                    property => (
                      <div key={property}>
                        <i>{property}</i>
                        {`: ${changes.update[table][building][property].oldValue}
                        → 
                        ${changes.update[table][building][property].newValue}`}
                      </div>
                    )
                  )}
                </div>
              ))}
              <br />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const TableButtons = ({ selected, tabulator, table }) => {
  const [filterToggle, setFilterToggle] = useState(false);
  const [selectedInTable, setSelectedInTable] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const data = useSelector(state => state.inputData.tables[table]);
  const dispatch = useDispatch();

  useEffect(() => {
    setSelectedInTable(Object.keys(data).includes(selected[0]));
  }, [table, selected]);

  const selectAll = () => {
    dispatch(setSelected(tabulator.current.getData().map(data => data.Name)));
  };

  const filterSelected = () => {
    if (filterToggle) {
      tabulator.current.clearFilter();
    } else {
      tabulator.current.setFilter('Name', 'in', selected);
    }
    setFilterToggle(oldValue => !oldValue);
  };

  const clearSelected = () => {
    dispatch(setSelected([]));
  };

  const deleteSelected = () => {
    Modal.confirm({
      title: 'Are you sure delete these buildings?',
      content: (
        <div>
          <i style={{ fontSize: '1vw' }}>
            This will delete the following buildings from every table:
          </i>
          <div style={{ overflow: 'auto', maxHeight: 200, margin: 10 }}>
            {selected.reduce((out, building) => `${out}, ${building}`)}
          </div>
        </div>
      ),
      centered: true,
      okText: 'DELETE',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        dispatch(deleteBuildings([...selected]));
      }
    });
  };

  const editSelected = () => {
    setModalVisible(true);
  };

  return (
    <div>
      <Button onClick={selectAll}>Select All</Button>
      <Button
        type={filterToggle ? 'primary' : 'default'}
        onClick={filterSelected}
      >
        Filter on Selection
      </Button>
      {selectedInTable ? (
        <React.Fragment>
          <Button onClick={editSelected}>Edit Selection</Button>
          <Button onClick={clearSelected}>Clear Selection</Button>
          <Button type="danger" onClick={deleteSelected}>
            Delete Selection
          </Button>
        </React.Fragment>
      ) : null}
      <EditSelectedModal
        visible={modalVisible}
        setVisible={setModalVisible}
        inputTable={tabulator.current}
        table={table}
      />
    </div>
  );
};

export default Table;

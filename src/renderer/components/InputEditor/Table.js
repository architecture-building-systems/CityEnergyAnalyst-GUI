import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { Card, Button } from 'antd';
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
        columnDef.minWidth = 150;
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
  const selected = useSelector(state => state.inputData.selected);
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
      <Button>Save</Button>
      <Button
        onClick={() => dispatch(discardChanges(() => console.log('discarded')))}
      >
        Discard Changes
      </Button>
    </React.Fragment>
  );
};

const TableButtons = ({ selected, tabulator, table }) => {
  const [filterToggle, setFilterToggle] = useState(false);
  const [selectedInTable, setSelectedInTable] = useState(true);
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
    dispatch(deleteBuildings([...selected]));
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

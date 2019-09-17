import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSelected } from '../../actions/inputEditor';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';

const useTableData = tab => {
  const tables = useSelector(state => state.inputData.tables);
  const columns = useSelector(state => state.inputData.columns);

  const [data, setData] = useState({ data: [], columnDef: [] });

  const getData = () =>
    Object.keys(tables[tab]).map(row => ({
      Name: row,
      ...tables[tab][row]
    }));

  const getColumnDef = () =>
    Object.keys(columns[tab]).map(column => {
      if (column === 'Name' || column === 'REFERENCE') {
        return {
          title: column,
          field: column,
          frozen: column === 'Name'
        };
      } else {
        return {
          title: column,
          field: column,
          editor: columns[tab][column].type === 'str' ? 'input' : 'number',
          minWidth: 150
        };
      }
    });

  useEffect(() => {
    setData({ data: getData(), columnDef: getColumnDef() });
  }, [tab]);

  return [data.data, data.columnDef];
};

const Table = ({ tab }) => {
  const [data, columnDef] = useTableData(tab);
  const selected = useSelector(state => state.inputData.selected);
  const tabulator = useRef(null);
  const divRef = useRef(null);
  const dispatch = useDispatch();

  const selectRow = (e, cell) => {
    console.log(e);
    const row = cell.getRow();
    if (cell.getField() === 'Name') {
      let newSelected = [...selected];
      if (cell.getRow().isSelected()) {
        dispatch(
          setSelected(newSelected.filter(name => name !== row.getIndex()))
        );
      } else {
        newSelected.push(row.getIndex());
        dispatch(setSelected(newSelected));
      }
    }
  };

  useEffect(() => {
    tabulator.current = new Tabulator(divRef.current, {
      data: data,
      index: 'Name',
      columns: columnDef,
      layout: 'fitDataFill',
      height: '300px',
      cellClick: selectRow
    });
  }, []);

  useEffect(() => {
    if (tabulator.current) {
      tabulator.current.setColumns(columnDef);
      tabulator.current.setData(data);
      tabulator.current.deselectRow();
      tabulator.current.selectRow(selected);
    }
  }, [data, columnDef]);

  useEffect(() => {
    if (tabulator.current) {
      tabulator.current.deselectRow();
      tabulator.current.selectRow(selected);
    }
  }, [selected]);

  return <div ref={divRef} />;
};

export default Table;

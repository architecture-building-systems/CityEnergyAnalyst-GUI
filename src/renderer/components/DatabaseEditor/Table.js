import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';
import {
  updateDatabaseState,
  updateDatabaseValidation
} from '../../actions/databaseEditor';
import { Button } from 'antd';

const Table = React.forwardRef((props, ref) => {
  return (
    <HotTable ref={ref} licenseKey="non-commercial-and-evaluation" {...props} />
  );
});

export const useTableUpdateRedux = tableRef => {
  const dispatch = useDispatch();
  const updateRedux = () => {
    dispatch(updateDatabaseState());
  };
  useEffect(() => {
    const tableID = tableRef.current.id;
    const tableInstance = tableRef.current.hotInstance;
    const colHeaders = tableInstance.getColHeader();
    const rowHeaders = tableInstance.getRowHeader();

    tableInstance.updateSettings({
      afterValidate: (isValid, value, row, prop, source) => {
        const col =
          typeof colHeaders[prop] !== 'undefined' ? colHeaders[prop] : prop;
        console.log(tableID, isValid, rowHeaders[row], col, value);
        dispatch(
          updateDatabaseValidation({
            id: tableID,
            isValid,
            row: rowHeaders[row],
            column: col,
            value
          })
        );
      },
      afterChange: (changes, source) => {
        if (source !== 'loadData') {
          const _changes = changes.map(change => {
            const [row, prop, oldVal, newVal] = change;
            const col =
              typeof colHeaders[prop] !== 'undefined' ? colHeaders[prop] : prop;
            console.log(tableID, rowHeaders[row], col, oldVal, newVal);
          });
        }
      }
    });
  }, []);
  return updateRedux;
};

export const TableButtons = ({ tableRef }) => {
  return (
    <div>
      <Button
        size="small"
        onClick={() => {
          tableRef.current.hotInstance.alter('insert_row');
        }}
      >
        Add Row
      </Button>
    </div>
  );
};

export default Table;

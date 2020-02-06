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

export const useTableUpdateRedux = (tableRef, database, sheet) => {
  const dispatch = useDispatch();
  const updateRedux = () => {
    dispatch(updateDatabaseState());
  };
  useEffect(() => {
    const tableInstance = tableRef.current.hotInstance;
    const colHeaders = tableInstance.getColHeader();
    const rowHeaders = tableInstance.getRowHeader();

    tableInstance.updateSettings({
      afterValidate: (isValid, value, row, prop, source) => {
        // Only dispatch to redux during edit, undo, redo
        switch (source) {
          case 'edit':
          case 'UndoRedo.undo':
          case 'UndoRedo.redo':
            {
              const col =
                typeof colHeaders[prop] !== 'undefined'
                  ? colHeaders[prop]
                  : prop;
              dispatch(
                updateDatabaseValidation({
                  database,
                  sheet,
                  isValid,
                  row: rowHeaders[row],
                  column: col,
                  value
                })
              );
            }
            break;
          default:
            break;
        }
      },
      afterChange: (changes, source) => {
        switch (source) {
          // Do nothing when loading data
          case 'loadData':
            break;
          default: {
            // const _changes = changes.map(change => {
            //   const [row, prop, oldVal, newVal] = change;
            //   const col =
            //     typeof colHeaders[prop] !== 'undefined'
            //       ? colHeaders[prop]
            //       : prop;
            // });
          }
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

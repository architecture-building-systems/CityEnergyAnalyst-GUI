import React, { useEffect, useState } from 'react';
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

    const afterValidate = (isValid, value, row, prop, source) => {
      // Do not dispatch if validated manually
      switch (source) {
        case 'validateCells':
          break;
        default: {
          const colHeader = tableInstance.getColHeader(prop) || prop;
          const rowHeader = tableInstance.getRowHeader(row) || row;

          dispatch(
            updateDatabaseValidation({
              database,
              sheet,
              isValid,
              row: rowHeader,
              column: colHeader,
              value
            })
          );
        }
      }
    };

    const afterChange = (changes, source) => {
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
    };

    Handsontable.hooks.add('afterValidate', afterValidate, tableInstance);
    Handsontable.hooks.add('afterChange', afterChange, tableInstance);
    return () => {
      Handsontable.hooks.remove('afterValidate', afterValidate, tableInstance);
      Handsontable.hooks.remove('afterChange', afterChange, tableInstance);
    };
  }, [sheet]);

  return updateRedux;
};

export const useTableUndoRedo = tableRef => {
  const [undoAvailable, setUndo] = useState(false);
  const [redoAvailable, setRedo] = useState(false);

  const undo = () => {
    tableRef.current.hotInstance.undo();
  };
  const redo = () => {
    tableRef.current.hotInstance.redo();
  };

  useEffect(() => {
    const tableInstance = tableRef.current.hotInstance;
    const checkUndo = () => {
      setUndo(tableInstance.isUndoAvailable());
    };
    const checkRedo = () => {
      setRedo(tableInstance.isRedoAvailable());
    };

    // Enable oberserveChanges for `change` event
    tableInstance.updateSettings({
      observeChanges: true
    });

    // Use `afterChangesObserverd instead of `afterChange`
    // to observe changes to number of rows
    Handsontable.hooks.add(
      'afterChangesObserved',
      [checkUndo, checkRedo],
      tableInstance
    );

    // Handsontable.hooks.add(
    //   'afterChange',
    //   [checkUndo, checkRedo],
    //   tableRef.current.hotInstance
    // );
  }, []);

  return {
    undoAvailable,
    redoAvailable,
    undo,
    redo
  };
};

export const TableButtons = ({ tableRef }) => {
  const { undoAvailable, redoAvailable, undo, redo } = useTableUndoRedo(
    tableRef
  );

  return (
    <div style={{ margin: 10 }}>
      <p>Sheet Functions</p>
      <Button
        size="small"
        onClick={() => {
          tableRef.current.hotInstance.alter('insert_row');
        }}
      >
        Add Row
      </Button>
      <Button size="small" icon="undo" disabled={!undoAvailable} onClick={undo}>
        Undo
      </Button>
      <Button size="small" icon="redo" disabled={!redoAvailable} onClick={redo}>
        Redo
      </Button>
    </div>
  );
};

export default Table;

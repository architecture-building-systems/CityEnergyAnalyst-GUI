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
      observeChanges: true,
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
    // Handsontable.hooks.add('afterChangesObserved', updateRedux, tableInstance);
  }, []);
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
    <div>
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

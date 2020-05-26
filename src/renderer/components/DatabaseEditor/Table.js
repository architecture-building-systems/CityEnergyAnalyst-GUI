import React, { useEffect, useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ActionCreators } from 'redux-undo';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';
import {
  updateDatabaseValidation,
  addDatabaseRow,
  editDatabaseData
} from '../../actions/databaseEditor';
import { Button } from 'antd';

const Table = React.forwardRef((props, ref) => {
  const {
    category,
    databaseName,
    tableName,
    dataLocator,
    rowHeaders,
    colHeaders
  } = props;
  const dispatch = useDispatch();
  const onBeforeChange = (changes, source) => {
    if (source !== 'loadData') {
      const filteredChanges = changes.filter(change => change[2] != change[3]);
      filteredChanges.length &&
        dispatch(
          editDatabaseData(
            category,
            databaseName,
            tableName,
            dataLocator,
            changes
          )
        );
    }
    return false;
  };
  return (
    <HotTable
      ref={ref}
      beforeChange={onBeforeChange}
      undo={false}
      observeChanges={true}
      {...props}
    />
  );
});

export const useTableUpdateRedux = (tableRef, database, sheet) => {
  const dispatch = useDispatch();

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

    Handsontable.hooks.add('afterValidate', afterValidate, tableInstance);
    return () => {
      Handsontable.hooks.remove('afterValidate', afterValidate, tableInstance);
    };
  }, [sheet]);

  return '';
};

// TODO: This is hardcoded, change to use schema
const restricted_databases = ['FEEDSTOCKS'];
const restricted_sheets = ['HEX'];

export const TableButtons = ({
  tableRef,
  databaseName,
  sheetName,
  columns
}) => {
  const dispatch = useDispatch();

  return (
    <div className="cea-database-editor-database-buttons">
      <p>Sheet Functions</p>
      {!restricted_databases.includes(databaseName) &&
        !restricted_sheets.includes(sheetName) && (
          <Button
            size="small"
            onClick={() => {
              dispatch(addDatabaseRow(databaseName, sheetName, columns));
            }}
          >
            Add Row
          </Button>
        )}
      <UndoButton tableRef={tableRef} />
      <RedoButton tableRef={tableRef} />
    </div>
  );
};

const UndoButton = ({ tableRef }) => {
  const isUndoAvailable = useSelector(
    state => state.databaseEditor.data.past.length > 1 // Prevent undoing to initial state without data
  );
  const dispatch = useDispatch();
  const handleClick = () => {
    isUndoAvailable && dispatch(ActionCreators.undo());
  };

  return (
    <Button
      size="small"
      icon="undo"
      disabled={!isUndoAvailable}
      onClick={handleClick}
    >
      Undo
    </Button>
  );
};

const RedoButton = () => {
  const isRedoAvailable = useSelector(
    state => state.databaseEditor.data.future.length > 0
  );
  const dispatch = useDispatch();
  const handleClick = () => {
    isRedoAvailable && dispatch(ActionCreators.redo());
  };

  return (
    <Button
      size="small"
      icon="redo"
      disabled={!isRedoAvailable}
      onClick={handleClick}
    >
      Redo
    </Button>
  );
};

export default Table;

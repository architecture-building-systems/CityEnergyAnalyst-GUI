import { forwardRef, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';
import {
  updateDatabaseState,
  updateDatabaseValidation,
  updateDatabaseChanges,
} from '../../actions/databaseEditor';
import { RedoOutlined, UndoOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useEventListener } from '../../utils/hooks';

const Table = forwardRef((props, ref) => {
  // useResizeActiveTable(ref);
  return <HotTable ref={ref} {...props} />;
});
Table.displayName = 'Table';

export const useTableUpdateRedux = (tableRef, database, sheet) => {
  const dispatch = useDispatch();
  const updateRedux = () => {
    dispatch(updateDatabaseState());
  };

  useEffect(() => {
    const tableInstance = tableRef.current.hotInstance;

    const afterValidate = (isValid, value, row, prop, source) => {
      const colHeader = tableInstance.getColHeader(
        tableInstance.propToCol(prop),
      );
      const rowHeader = tableInstance.getRowHeader(row) || row;

      if (!isValid) {
        // Set cells to invalid
        const meta = tableInstance.getCellMeta(
          row,
          tableInstance.propToCol(prop),
        );
        meta.valid = false;
      }

      // dispatch(
      //   updateDatabaseValidation({
      //     database,
      //     sheet,
      //     isValid,
      //     row: rowHeader,
      //     column: colHeader,
      //     value,
      //   }),
      // );
    };

    const afterChange = (changes, source) => {
      if (changes?.length)
        dispatch(updateDatabaseChanges({ database, sheet, changes }));
    };

    const afterCreateRow = (index) => {
      // Validate rows after creating new row
      tableInstance.validateRows([index]);
    };

    Handsontable.hooks.add('afterValidate', afterValidate, tableInstance);
    Handsontable.hooks.add('afterChange', afterChange, tableInstance);
    Handsontable.hooks.add('afterCreateRow', afterCreateRow, tableInstance);
    return () => {
      Handsontable.hooks.remove('afterValidate', afterValidate, tableInstance);
      Handsontable.hooks.remove('afterChange', afterChange, tableInstance);
      Handsontable.hooks.remove(
        'afterCreateRow',
        afterCreateRow,
        tableInstance,
      );
    };
  }, [sheet]);

  return updateRedux;
};

const useTableUndoRedo = (tableRef) => {
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
      observeChanges: true,
    });

    // Use `afterChangesObserverd instead of `afterChange`
    // to observe changes to number of rows
    Handsontable.hooks.add(
      'afterChangesObserved',
      [checkUndo, checkRedo],
      tableInstance,
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
    redo,
  };
};

// TODO: This is hardcoded, change to use schema
const restricted_databases = ['FEEDSTOCKS'];
const restricted_sheets = ['HEX'];

export const TableButtons = ({ tableRef, databaseName, sheetName }) => {
  const { undoAvailable, redoAvailable, undo, redo } =
    useTableUndoRedo(tableRef);

  return (
    <div style={{ margin: 10 }}>
      <p>Sheet Functions</p>
      {!restricted_databases.includes(databaseName) &&
        !restricted_sheets.includes(sheetName) && (
          <Button
            size="small"
            onClick={() => {
              tableRef.current.hotInstance.alter('insert_row');
            }}
          >
            Add Row
          </Button>
        )}
      <Button
        size="small"
        icon={<UndoOutlined />}
        disabled={!undoAvailable}
        onClick={undo}
      >
        Undo
      </Button>
      <Button
        size="small"
        icon={<RedoOutlined />}
        disabled={!redoAvailable}
        onClick={redo}
      >
        Redo
      </Button>
    </div>
  );
};

const useResizeActiveTable = (tableRef) => {
  const [windowWidth, setWindowWidth] = useState();
  const getWindowWidth = () => setWindowWidth(window.innerWidth);

  const renderTable = () => {
    const tabElement =
      tableRef.current.hotElementRef.parentElement.parentElement;
    const opacity = window.getComputedStyle(tabElement);
    // Resize table if it is active i.e. the tab element is visible
    // To prevent resizing hidden tab elements
    if (opacity)
      setTimeout(() => {
        tableRef.current.hotInstance.render();
      }, 100);
  };
  useEventListener('resize', getWindowWidth);

  // Rerender table only when the side navigation hides/unhides i.e. passing breakpoint width 992px
  useEffect(() => {
    renderTable();
  }, [windowWidth < 992]);
};

export default Table;

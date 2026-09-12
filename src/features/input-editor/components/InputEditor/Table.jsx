import { useEffect, useRef, useState } from 'react';
import { setDataPreservingScroll } from 'utils/tabulator';
import { message, Tooltip } from 'antd';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { createRoot } from 'react-dom/client';
import { isElectron } from 'utils/electron';
import { useSelectTool } from 'features/project/stores/tool-card';

import {
  INDEX_COLUMN,
  NO_GEOMETRY_FIX_ONE,
  NO_GEOMETRY_REASON,
} from 'features/input-editor/constants';
import { useUpdateInputs } from 'features/input-editor/hooks/updates/useUpdateInputs';
import {
  useSelected,
  useSetSelectedFromTable,
} from 'features/input-editor/stores/inputEditorStore';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { TableButtons } from 'features/input-editor/components/table-selection-buttons';
import { getColumnPropsFromDataType } from 'utils/tabulator';

const Table = ({ tab, tables, columns, rowsWithoutGeometry = [] }) => {
  const tabulator = useRef(null);

  const selected = useSelected();
  const setSelected = useSetSelectedFromTable();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <TableButtons
          selected={selected}
          tabulator={tabulator}
          tab={tab}
          tables={tables}
          columns={columns}
          setSelected={setSelected}
        />
      </div>
      <div style={{ minHeight: 0, flex: 1 }}>
        <ErrorBoundary>
          <TableEditor
            tabulator={tabulator}
            tab={tab}
            selected={selected}
            tables={tables}
            columns={columns}
            rowsWithoutGeometry={rowsWithoutGeometry}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

const TableEditor = ({
  tab,
  selected,
  tabulator,
  tables,
  columns,
  rowsWithoutGeometry = [],
}) => {
  const updateInputData = useUpdateInputs();
  const [data, columnDef] = useTableData(tab, columns, tables);
  const divRef = useRef(null);
  const tableRef = useRef(tab);
  // Marks the store update this table is about to cause, so the sync effect can skip it.
  const editedHereRef = useRef(false);
  // Read by `rowFormatter`, which Tabulator keeps from the options it was constructed with.
  // A ref means the highlight tracks the current data without tearing the table down.
  const rowsWithoutGeometryRef = useRef(rowsWithoutGeometry);
  const columnDescriptionRef = useRef();

  useEffect(() => {
    const filtered = tabulator.current && tabulator.current.getFilters().length;
    tabulator.current = new Tabulator(divRef.current, {
      data: [],
      index: INDEX_COLUMN,
      columns: [],
      layout: 'fitDataFill',
      layoutColumnsOnNewData: true,
      height: '100%',
      validationFailed: (cell) => {
        const field = cell.getField();
        const { type, constraints } = columnDescriptionRef.current[field];
        const content = (
          <span>
            <b>{field}</b> must be of type <i>{type}</i>.
            {constraints ? (
              <div>constraints: {JSON.stringify(constraints)}</div>
            ) : null}
          </span>
        );
        message.config({
          top: 120,
        });
        message.error(content);
        cell.cancelEdit();
      },
      cellEdited: (cell) => {
        editedHereRef.current = true;
        updateInputData(
          tableRef.current,
          [cell.getData()[INDEX_COLUMN]],
          [{ property: cell.getField(), value: cell.getValue() }],
        );
      },
      placeholder: '<div>No matching records found.</div>',
      // A row the map cannot draw. Not a validation failure -- the attributes are fine and the
      // row saves normally -- so it is tinted rather than flagged as an error. The banner above
      // the table says the map is incomplete; this marks which row.
      rowFormatter: (row) => {
        const name = row.getData()?.[INDEX_COLUMN];
        const missing = rowsWithoutGeometryRef.current.includes(name);
        row.getElement().classList.toggle('cea-input-row-no-geometry', missing);
        row.getElement().title = missing
          ? `This row ${NO_GEOMETRY_REASON} ${NO_GEOMETRY_FIX_ONE}`
          : '';
      },
    });
    filtered && tabulator.current.setFilter(INDEX_COLUMN, 'in', selected);
  }, []);

  // Keep reference of current table name
  useEffect(() => {
    tableRef.current = tab;
  }, [tab]);

  useEffect(() => {
    rowsWithoutGeometryRef.current = rowsWithoutGeometry;
    // Re-run the formatter against the new set; without this the tint survives a fix until
    // the table is rebuilt for some other reason.
    if (tabulator.current) tabulator.current.redraw(true);
    // Keyed on the contents, not the array: a new array is built on every render, and
    // `tabulator` is a ref, so neither belongs in the dependency list.
  }, [rowsWithoutGeometry.join(',')]);

  useEffect(() => {
    if (tabulator.current && columnDef !== null) {
      tabulator.current.setColumns(columnDef.columns);
      columnDescriptionRef.current = columnDef.description;

      // Add tooltips to column headers on column change
      document
        .querySelectorAll('.tabulator-col-content')
        .forEach((col, index) => {
          const { description, unit, choices } =
            columnDef.description[columnDef.columns[index].title];
          createRoot(col).render(
            <Tooltip
              title={
                description && (
                  <div>
                    {description}
                    <br />
                    {unit}
                    <br />
                    {isElectron() && typeof choices != 'undefined' && (
                      <a className="cea-input-editor-col-header-link">
                        Open File
                      </a>
                    )}
                  </div>
                )
              }
              getPopupContainer={() => {
                return document.getElementsByClassName('ant-card-body')[0];
              }}
            >
              <div className="tabulator-col-title">
                {columnDef.columns[index].title}
              </div>
              <div className="tabulator-arrow"></div>
            </Tooltip>,
          );
        });
    }
  }, [columnDef]);

  // Skip the rebuild for an edit made here: the cell already shows the new value, and
  // re-rendering would cost the user their scroll position.
  useEffect(() => {
    if (editedHereRef.current) {
      editedHereRef.current = false;
      return;
    }
    if (tabulator.current && data !== null) {
      setDataPreservingScroll(tabulator.current, data);
      tabulator.current.selectRow(selected);
    }
  }, [data]);

  useEffect(() => {
    if (tabulator.current) {
      tabulator.current.deselectRow();
      tabulator.current.selectRow(selected);
      tabulator.current.getFilters().length &&
        tabulator.current.setFilter(INDEX_COLUMN, 'in', selected);
    }
  }, [selected]);

  return (
    <>
      <div
        ref={divRef}
        style={{
          display: data !== null ? 'block' : 'none',
          height: '100%',
          width: '100%',
        }}
      />
      {data === null && <ScriptSuggestion tab={tab} />}
    </>
  );
};

// FIXME: Could get info from backend instead of hardcoding
const ScriptSuggestion = ({ tab }) => {
  const tabScriptMap = {
    typology: 'data-migrator',
    surroundings: 'surroundings-helper',
    trees: 'trees-helper',
  };

  const script = tabScriptMap?.[tab] ?? 'archetypes-mapper';
  const selectTool = useSelectTool();

  const handleClick = () => {
    selectTool(script);
  };

  return (
    <div style={{ margin: 8 }}>
      Input file could not be found. You can import/create the file using the{' '}
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          color: '#1890ff',
          textDecoration: 'underline',
          cursor: 'pointer',
          font: 'inherit',
        }}
        onClick={handleClick}
      >
        {script}
      </button>{' '}
      tool.
    </div>
  );
};

const useTableData = (tab, columns, tables) => {
  const [data, setData] = useState(null);
  const [columnDef, setColumnDef] = useState(null);

  const setSelected = useSetSelectedFromTable();

  const selectRow = (e, cell) => {
    const row = cell.getRow();
    const selectedRows = cell
      .getTable()
      .getSelectedData()
      .map((data) => data[INDEX_COLUMN]);
    if (e.ctrlKey || e.metaKey) {
      if (cell.getRow().isSelected())
        setSelected(selectedRows.filter((name) => name !== row.getIndex()));
      else setSelected([...selectedRows, row.getIndex()]);
    } else if (
      selectedRows.length !== [row.getIndex()].length ||
      !cell.getRow().isSelected()
    )
      setSelected([row.getIndex()]);
  };

  const getData = () =>
    tables?.[tab]
      ? Object.keys(tables[tab])
          .sort()
          .map((row) => ({
            [INDEX_COLUMN]: row,
            ...tables[tab][row],
          }))
      : null;

  useEffect(() => {
    if (columns[tab] === null) {
      // Return null values if data does not exist
      setColumnDef(null);
      setData(null);
    } else {
      const getColumnDef = () => {
        let _columns = Object.keys(columns[tab]).map((column) => {
          const columnDef = { title: column, field: column };

          // Handle special cases
          switch (column.toLowerCase()) {
            case 'reference':
              return columnDef;
            case INDEX_COLUMN.toLowerCase():
              return { ...columnDef, frozen: true, cellClick: selectRow };
          }

          // Hack to allow editing when double clicking
          columnDef.cellDblClick = () => {};

          const columnSchema = columns[tab][column];

          // Handle columns with choices
          if (columnSchema?.choices != undefined) {
            return {
              ...columnDef,
              editor: 'select',
              editorParams: {
                values: columnSchema.choices,
                listItemFormatter: (value, label) => {
                  if (!label) return value;
                  return `${value} : ${label}`;
                },
              },
            };
          }

          // Handle regular columns
          const dataTypeProps = getColumnPropsFromDataType(
            columnSchema,
            column,
          );
          return {
            ...columnDef,
            ...dataTypeProps,
          };
        });
        return { columns: _columns, description: columns[tab] };
      };

      setColumnDef(getColumnDef());
      setData(getData());
    }
  }, [tab]);

  useEffect(() => {
    if (tables[tab] !== null) {
      setData(getData());
    }
  }, [tables[tab]]);

  return [data, columnDef];
};

export default Table;

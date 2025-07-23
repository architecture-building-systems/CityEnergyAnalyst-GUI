import { useEffect, useRef, useState } from 'react';
import { message, Tooltip } from 'antd';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { createRoot } from 'react-dom/client';
import { isElectron } from 'utils/electron';
import { useSelectedToolStore } from 'features/tools/stores/selected-tool';

import { INDEX_COLUMN } from 'features/input-editor/constants';
import { useUpdateInputs } from 'features/input-editor/hooks/updates/useUpdateInputs';
import {
  useSelected,
  useSetSelectedFromTable,
} from 'features/input-editor/stores/inputEditorStore';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { TableButtons } from 'features/input-editor/components/table-selection-buttons';
import { toolTypes, useToolCardStore } from 'features/project/stores/tool-card';

const Table = ({ tab, tables, columns }) => {
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
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

const TableEditor = ({ tab, selected, tabulator, tables, columns }) => {
  const updateInputData = useUpdateInputs();
  const [data, columnDef] = useTableData(tab, columns, tables);
  const divRef = useRef(null);
  const tableRef = useRef(tab);
  const columnDescriptionRef = useRef();

  useEffect(() => {
    const filtered = tabulator.current && tabulator.current.getFilters().length;
    tabulator.current = new Tabulator(divRef.current, {
      data: [],
      index: INDEX_COLUMN,
      columns: [],
      layout: 'fitDataFill',
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
        updateInputData(
          tableRef.current,
          [cell.getData()[INDEX_COLUMN]],
          [{ property: cell.getField(), value: cell.getValue() }],
        );
      },
      placeholder: '<div>No matching records found.</div>',
    });
    filtered && tabulator.current.setFilter(INDEX_COLUMN, 'in', selected);
  }, []);

  // Keep reference of current table name
  useEffect(() => {
    tableRef.current = tab;
  }, [tab]);

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

  useEffect(() => {
    if (tabulator.current && data !== null) {
      tabulator.current.setData(data);
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
  const setSelectedTool = useSelectedToolStore(
    (state) => state.setSelectedTool,
  );
  const setToolType = useToolCardStore((state) => state.setToolType);

  const handleClick = () => {
    setSelectedTool(script);
    setToolType(toolTypes.TOOLS);
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
          let columnDef = { title: column, field: column };
          switch (column) {
            case 'REFERENCE':
              return columnDef;
            case INDEX_COLUMN:
              return { ...columnDef, frozen: true, cellClick: selectRow };
            default: {
              const dataType = columns[tab][column].type;
              columnDef = {
                ...columnDef,
                minWidth: 100,
                // Hack to allow editing when double clicking
                cellDblClick: () => {},
              };
              if (columns[tab][column]?.choices != undefined)
                return {
                  ...columnDef,
                  minWidth: 170,
                  editor: 'select',
                  editorParams: {
                    values: columns[tab][column].choices,
                    listItemFormatter: (value, label) => {
                      if (!label) return value;
                      return `${value} : ${label}`;
                    },
                  },
                };
              switch (dataType) {
                case 'int':
                case 'year':
                  return {
                    ...columnDef,
                    editor: 'input',
                    validator: ['required', 'regex:^([1-9][0-9]*|0)$'],
                    mutatorEdit: (value) => Number(value),
                  };
                case 'float':
                  return {
                    ...columnDef,
                    editor: 'input',
                    validator: [
                      'required',
                      'regex:^([1-9][0-9]*|0)?(\\.\\d+)?$',
                      ...(columns[tab][column]?.constraints
                        ? Object.keys(columns[tab][column].constraints).map(
                            (constraint) =>
                              `${constraint}:${columns[tab][column].constraints[constraint]}`,
                          )
                        : []),
                    ],
                    mutatorEdit: (value) => Number(value),
                  };
                case 'date':
                  return {
                    ...columnDef,
                    editor: 'input',
                    validator: [
                      'required',
                      'regex:^[0-3][0-9]\\|[0-1][0-9]$',
                      { type: simpleDateVal },
                    ],
                  };
                case 'string':
                  return {
                    ...columnDef,
                    editor: 'input',
                    validator: [
                      ...(columns[tab][column]?.nullable ? [] : ['required']),
                    ],
                  };
                case 'boolean':
                  return {
                    ...columnDef,
                    editor: 'select',
                    editorParams: {
                      values: [true, false],
                    },
                    mutator: (value) => !!value,
                  };
                case 'Polygon':
                  // Ignore polygons for now
                  return columnDef;
                default:
                  console.error(
                    `Could not find column validation for type "${dataType}" for column "${column}"`,
                  );
                  return columnDef;
              }
            }
          }
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

const simpleDateVal = (cell, value) => {
  const [date, month] = value.split('|').map((number) => Number(number));
  const daysInMonths = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysInMonths[month] >= date;
};

export default Table;

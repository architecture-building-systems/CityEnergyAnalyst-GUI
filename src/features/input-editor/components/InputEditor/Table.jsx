import { useEffect, useRef, useState } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Card, Button, Modal, message, Tooltip, Space } from 'antd';
import EditSelectedModal from './EditSelectedModal';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import ScheduleEditor from './ScheduleEditor';
import { getOperatingSystem } from 'utils';
import { AsyncError } from 'utils/AsyncError';
import { createRoot } from 'react-dom/client';
import { isElectron } from 'utils/electron';
import { useToolCardStore } from 'features/tools/stores/toolCardStore';

import { INDEX_COLUMN } from './constants';
import { useSaveInputs } from 'features/input-editor/hooks/mutations/useSaveInputs';
import {
  useDeleteBuildings,
  useResyncInputs,
  useUpdateInputs,
} from 'features/input-editor/hooks/updates/useUpdateInputs';
import {
  useChanges,
  useDiscardChanges,
  useSelected,
  useSetSelected,
} from 'features/input-editor/stores/inputEditorStore';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { useSetShowLoginModal } from 'features/auth/stores/login-modal';

const title = `You can select multiple buildings in the table and the map by holding down the "${getOperatingSystem() == 'Mac' ? 'Command' : 'Control'}" key`;

const Table = ({ tab, tables, columns }) => {
  const selected = useSelected();
  const changes = useChanges();

  const tabulator = useRef(null);

  return (
    <>
      <InputEditorButtons changes={changes} />

      <Card
        styles={{ header: { backgroundColor: '#f1f1f1' } }}
        size="small"
        title={
          <Tooltip placement="right" title={title}>
            <InfoCircleOutlined />
          </Tooltip>
        }
        extra={
          <TableButtons
            selected={selected}
            tabulator={tabulator}
            tab={tab}
            tables={tables}
            columns={columns}
          />
        }
      >
        <ErrorBoundary>
          {tab == 'schedules' ? (
            <ScheduleEditor
              tabulator={tabulator}
              selected={selected}
              tables={tables}
            />
          ) : (
            <TableEditor
              tabulator={tabulator}
              tab={tab}
              selected={selected}
              tables={tables}
              columns={columns}
            />
          )}
        </ErrorBoundary>
      </Card>
    </>
  );
};

const InputEditorButtons = ({ changes }) => {
  const saveChanges = useSaveInputs();
  const resyncInputs = useResyncInputs();
  const discardChangesFunc = useDiscardChanges();

  const setShowLoginModal = useSetShowLoginModal();

  const discardChanges = async () => {
    // TODO: Throw error
    await resyncInputs();
    discardChangesFunc();
  };

  const noChanges =
    !Object.keys(changes.update).length && !Object.keys(changes.delete).length;

  const _saveChanges = () => {
    Modal.confirm({
      title: 'Save these changes?',
      content: (
        <details>
          <summary>Show changes</summary>
          <ChangesSummary changes={changes} />
        </details>
      ),
      centered: true,
      okText: 'SAVE',
      okType: 'primary',
      cancelText: 'Cancel',
      async onOk() {
        await saveChanges
          .mutateAsync()
          .then(() => {
            message.config({
              top: 120,
            });
            message.success('Changes Saved!');
          })
          .catch((error) => {
            if (error.response.status === 401) setShowLoginModal(true);
            else {
              Modal.error({
                title: 'Could not save changes',
                content: <AsyncError error={error} />,
                width: '80vw',
              });
            }
          });
      },
    });
  };

  const _discardChanges = () => {
    Modal.confirm({
      title: 'This will discard all unsaved changes.',
      content: (
        <details>
          <summary>Show changes</summary>
          <ChangesSummary changes={changes} />
        </details>
      ),
      centered: true,
      okText: 'DISCARD',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        await discardChanges()
          .then(() => {
            message.config({
              top: 120,
            });
            message.info('Unsaved changes have been discarded.');
          })
          .catch((error) => {
            console.error(error);
            message.error('Something went wrong.', 0);
          });
      },
    });
  };

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <Button type="primary" disabled={noChanges} onClick={_saveChanges}>
        Save
      </Button>
      <Button
        type="primary"
        disabled={noChanges}
        onClick={_discardChanges}
        danger
      >
        Discard Changes
      </Button>
    </div>
  );
};

const ChangesSummary = ({ changes }) => {
  return (
    <div style={{ overflow: 'auto', maxHeight: 400 }}>
      {Object.keys(changes.delete).length ? (
        <div>
          <b>DELETE:</b>
          {Object.keys(changes.delete).map((table) => (
            <div key={table}>
              <u>
                <b>{table}</b>
              </u>
              <div>
                {changes.delete[table].reduce(
                  (out, building) => `${out}, ${building}`,
                )}
              </div>
              <br />
            </div>
          ))}
        </div>
      ) : null}
      {Object.keys(changes.update).length ? (
        <div>
          <b>UPDATE:</b>
          {Object.keys(changes.update).map((table) => (
            <div key={table}>
              <u>
                <b>{table}</b>
              </u>
              {Object.keys(changes.update[table]).map((building) => (
                <div key={building}>
                  {building}
                  {Object.keys(changes.update[table][building]).map(
                    (property) => (
                      <div key={property}>
                        <i>{property}</i>
                        {` : ${changes.update[table][building][property].oldValue}
                        → 
                        ${changes.update[table][building][property].newValue}`}
                      </div>
                    ),
                  )}
                </div>
              ))}
              <br />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const TableButtons = ({ selected, tabulator, tables, tab, columns }) => {
  const deleteBuildings = useDeleteBuildings();

  const setSelected = useSetSelected();

  const [filterToggle, setFilterToggle] = useState(false);
  const [selectedInTable, setSelectedInTable] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const data = tables;

  useEffect(() => {
    const selectedType = ['surroundings', 'trees'].includes(tab) ? tab : 'zone';
    setSelectedInTable(
      Object.keys(data?.[selectedType] || {}).includes(selected[0]),
    );
  }, [tab, selected]);

  const selectAll = () => {
    setSelected(tabulator.current.getData().map((data) => data[INDEX_COLUMN]));
  };

  const filterSelected = () => {
    if (filterToggle) {
      tabulator.current.clearFilter();
    } else {
      tabulator.current.setFilter(INDEX_COLUMN, 'in', selected);
    }
    tabulator.current.redraw();
    setFilterToggle((oldValue) => !oldValue);
  };

  const clearSelected = () => {
    setSelected([]);
  };

  const deleteSelected = () => {
    Modal.confirm({
      title: `Are you sure delete these ${tab == 'trees' ? 'trees ' : 'buildings'}?`,
      content: (
        <div>
          <i style={{ fontSize: '1vw' }}>
            This will delete the following{' '}
            {tab == 'trees' ? 'trees ' : 'buildings'} from every table:
          </i>
          <div style={{ overflow: 'auto', maxHeight: 200, margin: 10 }}>
            {selected.reduce((out, building) => `${out}, ${building}`)}
          </div>
        </div>
      ),
      centered: true,
      okText: 'DELETE',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        deleteBuildings([...selected]);
      },
    });
  };

  const editSelected = () => {
    setModalVisible(true);
  };

  return (
    <Space>
      <Button onClick={selectAll}>Select All</Button>
      <Button
        type={filterToggle ? 'primary' : 'default'}
        onClick={filterSelected}
      >
        Filter on Selection
      </Button>
      {selectedInTable ? (
        <>
          {tab != 'schedules' && (
            <Button onClick={editSelected}>Edit Selection</Button>
          )}
          <Button onClick={clearSelected}>Clear Selection</Button>
          <Button onClick={deleteSelected} danger>
            Delete Selection
          </Button>
        </>
      ) : null}
      <EditSelectedModal
        visible={modalVisible}
        setVisible={setModalVisible}
        inputTable={tabulator.current}
        table={tab}
        columns={columns}
      />
    </Space>
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
      height: '300px',
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
      <div ref={divRef} style={{ display: data !== null ? 'block' : 'none' }} />
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
  const setShowTools = useToolCardStore((state) => state.setShowTools);
  const setSelectedTool = useToolCardStore((state) => state.setVisibility);

  return (
    <div style={{ margin: 8 }}>
      Input file could not be found. You can import/create the file using the{' '}
      <span
        style={{
          cursor: 'pointer',
          textDecoration: 'underline',
          color: 'blue',
        }}
        onClick={() => {
          setSelectedTool(script);
          setShowTools(true);
        }}
      >
        {script}
      </span>{' '}
      tool.
    </div>
  );
};

const useTableData = (tab, columns, tables) => {
  const [data, setData] = useState(null);
  const [columnDef, setColumnDef] = useState(null);

  const setSelected = useSetSelected();

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

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { Card, Button, Modal, message, Tooltip, Icon } from 'antd';
import {
  setSelected,
  updateInputData,
  deleteBuildings,
  discardChanges,
  saveChanges
} from '../../actions/inputEditor';
import EditSelectedModal from './EditSelectedModal';
import routes from '../../constants/routes';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import ScheduleEditor from './ScheduleEditor';

const Table = ({ tab }) => {
  const { selected, changes, schedules } = useSelector(
    state => state.inputData
  );
  const tabulator = useRef(null);

  return (
    <React.Fragment>
      <Card
        headStyle={{ backgroundColor: '#f1f1f1' }}
        size="small"
        title={
          <Tooltip
            placement="right"
            title="You can select multiple buildings in the table and the map by holding down the `Ctrl` key"
          >
            <Icon type="info-circle" />
          </Tooltip>
        }
        extra={
          <TableButtons selected={selected} tabulator={tabulator} tab={tab} />
        }
      >
        {tab == 'schedules' ? (
          <ScheduleEditor
            tabulator={tabulator}
            selected={selected}
            schedules={schedules}
          />
        ) : (
          <TableEditor tabulator={tabulator} tab={tab} selected={selected} />
        )}
      </Card>
      <InputEditorButtons changes={changes} />
    </React.Fragment>
  );
};

const InputEditorButtons = ({ changes }) => {
  const dispatch = useDispatch();
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
        await dispatch(saveChanges())
          .then(data => {
            console.log(data);
            message.config({
              top: 120
            });
            message.success('Changes Saved!');
          })
          .catch(error => {
            console.log(error);
            message.config({
              top: 120
            });
            message.error('Something went wrong.', 0);
          });
      }
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
        await dispatch(discardChanges())
          .then(data => {
            console.log(data);
            message.config({
              top: 120
            });
            message.info('Unsaved changes have been discarded.');
          })
          .catch(error => {
            console.log(error);
            message.error('Something went wrong.', 0);
          });
      }
    });
  };

  return (
    <React.Fragment>
      <Button style={{ margin: 5 }} disabled={noChanges} onClick={_saveChanges}>
        Save
      </Button>
      <Button
        style={{ margin: 5 }}
        type="danger"
        disabled={noChanges}
        onClick={_discardChanges}
      >
        Discard Changes
      </Button>
    </React.Fragment>
  );
};

const ChangesSummary = ({ changes }) => {
  return (
    <div style={{ overflow: 'auto', maxHeight: 400 }}>
      {Object.keys(changes.delete).length ? (
        <div>
          <b>DELETE:</b>
          {Object.keys(changes.delete).map(table => (
            <div key={table}>
              <u>
                <b>{table}</b>
              </u>
              <div>
                {changes.delete[table].reduce(
                  (out, building) => `${out}, ${building}`
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
          {Object.keys(changes.update).map(table => (
            <div key={table}>
              <u>
                <b>{table}</b>
              </u>
              {Object.keys(changes.update[table]).map(building => (
                <div key={building}>
                  {building}
                  {Object.keys(changes.update[table][building]).map(
                    property => (
                      <div key={property}>
                        <i>{property}</i>
                        {` : ${changes.update[table][building][property].oldValue}
                        → 
                        ${changes.update[table][building][property].newValue}`}
                      </div>
                    )
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

const TableButtons = ({ selected, tabulator, tab }) => {
  const [filterToggle, setFilterToggle] = useState(false);
  const [selectedInTable, setSelectedInTable] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const data = useSelector(state => state.inputData.tables);
  const dispatch = useDispatch();

  useEffect(() => {
    const tableData = data[tab] || tab == 'schedules' ? data['zone'] : {};
    setSelectedInTable(Object.keys(tableData).includes(selected[0]));
  }, [tab, selected]);

  const selectAll = () => {
    dispatch(setSelected(tabulator.current.getData().map(data => data.Name)));
  };

  const filterSelected = () => {
    if (filterToggle) {
      tabulator.current.clearFilter();
    } else {
      tabulator.current.setFilter('Name', 'in', selected);
    }
    tabulator.current.redraw();
    setFilterToggle(oldValue => !oldValue);
  };

  const clearSelected = () => {
    dispatch(setSelected([]));
  };

  const deleteSelected = () => {
    Modal.confirm({
      title: 'Are you sure delete these buildings?',
      content: (
        <div>
          <i style={{ fontSize: '1vw' }}>
            This will delete the following buildings from every table:
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
        dispatch(deleteBuildings([...selected]));
      }
    });
  };

  const editSelected = () => {
    setModalVisible(true);
  };

  return (
    <div>
      <Button onClick={selectAll}>Select All</Button>
      <Button
        type={filterToggle ? 'primary' : 'default'}
        onClick={filterSelected}
      >
        Filter on Selection
      </Button>
      {selectedInTable ? (
        <React.Fragment>
          {tab != 'schedules' && (
            <Button onClick={editSelected}>Edit Selection</Button>
          )}
          <Button onClick={clearSelected}>Clear Selection</Button>
          <Button type="danger" onClick={deleteSelected}>
            Delete Selection
          </Button>
        </React.Fragment>
      ) : null}
      <EditSelectedModal
        visible={modalVisible}
        setVisible={setModalVisible}
        inputTable={tabulator.current}
        table={tab}
      />
    </div>
  );
};

const TableEditor = ({ tab, selected, tabulator }) => {
  const [data, columnDef] = useTableData(tab);
  const dispatch = useDispatch();
  const divRef = useRef(null);
  const tableRef = useRef(tab);

  useEffect(() => {
    const filtered = tabulator.current && tabulator.current.getFilters().length;
    tabulator.current = new Tabulator(divRef.current, {
      data: data,
      index: 'Name',
      columns: columnDef.columns,
      layout: 'fitDataFill',
      height: '300px',
      validationFailed: cell => {
        cell.cancelEdit();
      },
      cellEdited: cell => {
        dispatch(
          updateInputData(
            tableRef.current,
            [cell.getData()['Name']],
            [{ property: cell.getField(), value: cell.getValue() }]
          )
        );
      },
      placeholder: '<div>No matching records found.</div>'
    });
    filtered && tabulator.current.setFilter('Name', 'in', selected);
  }, []);

  // Keep reference of current table name
  useEffect(() => {
    tableRef.current = tab;
  }, [tab]);

  useEffect(() => {
    if (tabulator.current) {
      tabulator.current.setData([]);
      tabulator.current.setColumns(columnDef.columns);
    }
  }, [columnDef]);

  useEffect(() => {
    if (tabulator.current) {
      if (!tabulator.current.getData().length) {
        tabulator.current.setData(data);
        tabulator.current.selectRow(selected);
        // Add tooltips to column headers on new data
        document
          .querySelectorAll('.tabulator-col-content')
          .forEach((col, index) => {
            const { description, unit } = columnDef.description[index];
            ReactDOM.render(
              <Tooltip
                title={
                  description && (
                    <div>
                      {description}
                      <br />
                      {unit}
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
              col
            );
          });
      } else if (tabulator.current.getData().length == data.length) {
        tabulator.current.updateData(data);
      } else tabulator.current.setData(data);
    }
  }, [data]);

  useEffect(() => {
    if (tabulator.current) {
      tabulator.current.deselectRow();
      tabulator.current.selectRow(selected);
      tabulator.current.getFilters().length &&
        tabulator.current.setFilter('Name', 'in', selected);
    }
  }, [selected]);

  return (
    <React.Fragment>
      <div ref={divRef} style={{ display: data.length ? 'block' : 'none' }} />
      {!data.length ? (
        <div>
          Input file could not be found. You can create the file using
          {tab == 'surroundings' ? (
            <Link to={`${routes.TOOLS}/surroundings-helper`}>
              {' surroundings-helper '}
            </Link>
          ) : (
            <Link to={`${routes.TOOLS}/data-helper`}>{' data-helper '}</Link>
          )}
          tool.
        </div>
      ) : null}
    </React.Fragment>
  );
};

const useTableData = tab => {
  const { columns, tables } = useSelector(state => state.inputData);
  const [data, setData] = useState([]);
  const [columnDef, setColumnDef] = useState({ columns: [], description: [] });

  const dispatch = useDispatch();

  const selectRow = (e, cell) => {
    const row = cell.getRow();
    if (!e.ctrlKey) {
      dispatch(setSelected([row.getIndex()]));
    } else {
      const selectedRows = cell
        .getTable()
        .getSelectedData()
        .map(data => data.Name);
      if (cell.getRow().isSelected()) {
        dispatch(
          setSelected(selectedRows.filter(name => name !== row.getIndex()))
        );
      } else {
        dispatch(setSelected([...selectedRows, row.getIndex()]));
      }
    }
  };

  const getData = () =>
    Object.keys(tables[tab])
      .sort()
      .map(row => ({
        Name: row,
        ...tables[tab][row]
      }));

  const getColumnDef = () => {
    let description = [];
    let _columns = Object.keys(columns[tab]).map(column => {
      description.push({
        description: columns[tab][column].description,
        unit: columns[tab][column].unit
      });
      let columnDef = { title: column, field: column };
      if (column === 'Name') {
        columnDef.frozen = true;
        columnDef.cellClick = selectRow;
      } else if (column !== 'REFERENCE') {
        columnDef.editor = 'input';
        columnDef.validator =
          columns[tab][column].type === 'str' ? 'string' : 'numeric';
        columnDef.minWidth = 100;
        // Hack to allow editing when double clicking
        columnDef.cellDblClick = () => {};
      }
      return columnDef;
    });
    return { columns: _columns, description: description };
  };
  useEffect(() => {
    setColumnDef(getColumnDef());
    setData(getData());
  }, [tab]);

  useEffect(() => {
    setData(getData());
  }, [tables[tab]]);

  return [data, columnDef];
};

export default Table;

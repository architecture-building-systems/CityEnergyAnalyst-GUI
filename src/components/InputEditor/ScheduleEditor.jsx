import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import interpolate from 'color-interpolate';
import {
  fetchBuildingSchedule,
  setSelected,
  updateDaySchedule,
  updateYearSchedule,
} from '../../actions/inputEditor';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './ScheduleEditor.css';
import { months_short } from '../../constants/months';
import { Tabs, Spin } from 'antd';

const colormap = interpolate(['white', '#006ad5']);

const ScheduleEditor = ({ selected, schedules, tabulator }) => {
  const { tables } = useSelector((state) => state.inputData);
  const [tab, setTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const buildings = Object.keys(tables.zone || {});
  const dispatch = useDispatch();
  const divRef = useRef(null);
  const timeoutRef = useRef();

  const selectRow = (e, cell) => {
    const row = cell.getRow();
    const selectedRows = cell
      .getTable()
      .getSelectedData()
      .map((data) => data.Name);
    if (!e.ctrlKey) {
      (selectedRows.length !== [row.getIndex()].length ||
        !cell.getRow().isSelected()) &&
        dispatch(setSelected([row.getIndex()]));
    } else {
      if (cell.getRow().isSelected()) {
        dispatch(
          setSelected(selectedRows.filter((name) => name !== row.getIndex()))
        );
      } else {
        dispatch(setSelected([...selectedRows, row.getIndex()]));
      }
    }
  };

  // Initialize table
  useEffect(() => {
    const filtered = tabulator.current && tabulator.current.getFilters().length;
    tabulator.current = new Tabulator(divRef.current, {
      data: buildings.sort().map((building) => ({ Name: building })),
      index: 'Name',
      columns: [{ title: 'Name', field: 'Name' }],
      layout: 'fitColumns',
      height: '300px',
      cellClick: selectRow,
    });
    filtered && tabulator.current.setFilter('Name', 'in', selected);
  }, []);

  useEffect(() => {
    const buildings = Object.keys(tables.zone || {});
    tabulator.current &&
      tabulator.current.replaceData(
        buildings.sort().map((building) => ({ Name: building }))
      );
    tabulator.current.selectRow(selected);
    tabulator.current.redraw();
  }, [tables]);

  useEffect(() => {
    tabulator.current && tabulator.current.deselectRow();
    if (buildings.includes(selected[0])) {
      tabulator.current && tabulator.current.selectRow(selected);
      setLoading(false);
      clearTimeout(timeoutRef.current);
      const missingSchedules = selected.filter(
        (building) => !Object.keys(schedules).includes(building)
      );
      if (missingSchedules.length) {
        setLoading(true);
        timeoutRef.current = setTimeout(() => {
          dispatch(fetchBuildingSchedule(missingSchedules))
            .catch((error) => {
              console.error(error);
              setErrors(error);
            })
            .finally(() => {
              setLoading(false);
            });
        }, 1000);
      }
    }
    tabulator.current &&
      tabulator.current.getFilters().length &&
      tabulator.current.setFilter('Name', 'in', selected);
  }, [selected]);

  if (!buildings.length) return <div>No buildings found</div>;

  return (
    <div className="cea-schedule-container">
      <div className="cea-schedule-buildings">
        <div ref={divRef} />
      </div>
      <Spin spinning={loading}>
        <div className="cea-schedule-test">
          {buildings.includes(selected[0]) ? (
            Object.keys(errors).length ? (
              <div className="cea-schedule-error">
                ERRORS FOUND:
                {Object.keys(errors).map((building) => (
                  <div
                    key={building}
                  >{`${building}: ${errors[building].message}`}</div>
                ))}
              </div>
            ) : (
              <>
                <div className="cea-schedule-year">
                  <YearTable
                    selected={selected}
                    schedules={schedules}
                    loading={loading}
                  />
                </div>
                <div className="cea-schedule-data">
                  <DataTable
                    selected={selected}
                    tab={tab}
                    schedules={schedules}
                    loading={loading}
                  />
                </div>
                <div className="cea-schedule-tabs">
                  <ScheduleTab
                    tab={tab}
                    setTab={setTab}
                    schedules={schedules}
                  />
                </div>
              </>
            )
          ) : (
            <div className="cea-schedule-no-data">
              {selected.length
                ? 'Selected buildings do not have a schedule'
                : 'No building selected'}
            </div>
          )}
        </div>
      </Spin>
    </div>
  );
};

const DataTable = ({ selected, tab, schedules, loading }) => {
  const tabulator = useRef(null);
  const divRef = useRef(null);
  const tooltipsRef = useRef({ selected, schedules, tab });
  const dispatch = useDispatch();

  useEffect(() => {
    tabulator.current = new Tabulator(divRef.current, {
      data: [],
      index: 'DAY',
      columns: [
        { title: 'DAY \\ HOUR', field: 'DAY', width: 100, headerSort: false },
        ...[...Array(24).keys()].map((i) => ({
          title: (i + 1).toString(),
          field: i.toString(),
          headerSort: false,
          editor: 'input',
          // Hack to allow editing when double clicking
          cellDblClick: () => {},
          formatter: (cell) => {
            formatCellStyle(cell);
            return cell.getValue();
          },
        })),
      ],
      validationFailed: (cell) => {
        cell.cancelEdit();
      },
      cellEdited: (cell) => {
        formatCellStyle(cell);
        dispatch(
          updateDaySchedule(
            tooltipsRef.current.selected,
            tooltipsRef.current.tab,
            cell.getData().DAY,
            Number(cell.getField()),
            cell.getValue()
          )
        );
      },
      layoutColumnsOnNewData: true,
      layout: 'fitDataFill',
      tooltips: (cell) => {
        if (cell.getValue() == 'DIFF') {
          let out = '';
          for (const building of tooltipsRef.current.selected.sort()) {
            out += `${building} - ${
              tooltipsRef.current.schedules[building].SCHEDULES[
                tooltipsRef.current.tab
              ][cell.getData().DAY][cell.getField()]
            }\n`;
          }
          return out;
        }
      },
    });
  }, []);

  // Update column definitions for input validation
  useEffect(() => {
    const columnDefs = tabulator.current.getColumnDefinitions();
    tabulator.current.setColumns(
      columnDefs.map((def) => {
        if (def.field == 'DAY') {
          return def;
        }
        if (tab == 'HEATING' || tab == 'COOLING') {
          return {
            ...def,
            editor: 'select',
            editorParams: {
              values: ['OFF', 'SETBACK', 'SETPOINT'],
            },
            validator: null,
            mutatorEdit: null,
          };
        }

        if (tab == 'ELECTROMOBILITY') {
          return {
            ...def,
            editor: 'input',
            editorParams: null,
            validator: ['required', 'regex:^\\d+$'],
            mutatorEdit: (value) => Number(value),
          };
        }

        return {
          ...def,
          // 2 decimal places
          editor: 'input',
          editorParams: null,
          validator: ['required', 'regex:^(1|0)?(\\.\\d+)?$', 'max:1'],
          mutatorEdit: (value) => Number(Math.round(value + 'e2') + 'e-2'),
        };
      })
    );
  }, [tab]);

  useEffect(() => {
    tooltipsRef.current = { selected, schedules, tab };
    tab &&
      selected.every((building) => Object.keys(schedules).includes(building)) &&
      tabulator.current.updateOrAddData(parseData(schedules, selected, tab));
  }, [selected, schedules, tab]);

  useEffect(() => {
    selected.every((building) => Object.keys(schedules).includes(building)) &&
      tabulator.current.redraw(true);
  }, [selected, tab, loading]);

  return <div ref={divRef} />;
};

const YearTable = ({ selected, schedules, loading }) => {
  const tabulator = useRef(null);
  const divRef = useRef(null);
  const tooltipsRef = useRef({ selected, schedules });
  const dispatch = useDispatch();

  useEffect(() => {
    tabulator.current = new Tabulator(divRef.current, {
      data: [],
      index: 'name',
      columns: [
        { title: '', field: 'name', headerSort: false },
        ...[...Array(12).keys()].map((i) => ({
          title: months_short[i],
          field: i.toString(),
          headerSort: false,
          editor: 'input',
          validator: ['required', 'regex:^(1|0)?(\\.\\d+)?$', 'max:1'],
          // Hack to allow editing when double clicking
          cellDblClick: () => {},
          formatter: (cell) => {
            formatCellStyle(cell);
            return cell.getValue();
          },
        })),
      ],
      validationFailed: (cell) => {
        cell.cancelEdit();
      },
      cellEdited: (cell) => {
        formatCellStyle(cell);
        dispatch(
          updateYearSchedule(
            tooltipsRef.current.selected,
            cell.getField(),
            cell.getValue()
          )
        );
      },
      layout: 'fitDataFill',
      tooltips: (cell) => {
        if (cell.getValue() == 'DIFF') {
          let out = '';
          for (const building of tooltipsRef.current.selected.sort()) {
            out += `${building} - ${
              tooltipsRef.current.schedules[building].MONTHLY_MULTIPLIER[
                cell.getField()
              ]
            }\n`;
          }
          return out;
        }
      },
    });

    const redrawTable = () => {
      tabulator.current.redraw();
    };
    window.addEventListener('resize', redrawTable);

    return () => {
      window.removeEventListener('resize', redrawTable);
    };
  }, []);

  useEffect(() => {
    tooltipsRef.current = { selected, schedules };
    selected.every((building) => Object.keys(schedules).includes(building)) &&
      tabulator.current.updateOrAddData(parseYearData(schedules, selected));
  }, [schedules, selected]);

  useEffect(() => {
    selected.every((building) => Object.keys(schedules).includes(building)) &&
      tabulator.current.redraw(true);
  }, [selected, loading]);

  return <div ref={divRef} />;
};

const ScheduleTab = ({ tab, setTab, schedules }) => {
  const TabPanes = getScheduleTypes(schedules).map((schedule) => (
    <Tabs.TabPane tab={schedule} key={schedule} />
  ));

  useEffect(() => {
    if (!tab) setTab(getScheduleTypes(schedules)[0] || null);
  }, [schedules]);

  if (!tab) return null;
  return (
    <Tabs activeKey={tab} onChange={setTab} type="card" tabPosition="bottom">
      {TabPanes}
    </Tabs>
  );
};

const formatCellStyle = (cell) => {
  const states = ['OFF', 'SETBACK', 'SETPOINT'];
  const value = cell.getValue();
  if (value == 'DIFF') {
    cell.getElement().style.fontWeight = 'bold';
    cell.getElement().style.fontStyle = 'italic';
  } else {
    if (!isNaN(value) && value != 0) {
      cell.getElement().style.backgroundColor = addRGBAlpha(
        colormap(value),
        0.5
      );
    } else if (states.includes(value) && states.indexOf(value) != 0) {
      cell.getElement().style.backgroundColor = addRGBAlpha(
        colormap(states.indexOf(value) / (states.length - 1)),
        0.5
      );
    } else {
      cell.getElement().style.backgroundColor = '';
    }
    cell.getElement().style.fontWeight = 'normal';
    cell.getElement().style.fontStyle = 'normal';
  }
};

const addRGBAlpha = (color, opacity) => {
  const rgb = color.replace(/[^\d,]/g, '').split(',');
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity}`;
};

const parseYearData = (schedules, selected) => {
  let out = [];
  for (const building of selected) {
    const buildingSchedule = schedules[building].MONTHLY_MULTIPLIER;
    out = diffArray(out, buildingSchedule);
  }
  return [{ name: 'MONTHLY_MULTIPLIER', ...out }];
};

const parseData = (schedules, selected, tab) => {
  let out = {};
  for (const building of selected) {
    const days = schedules[building].SCHEDULES[tab];
    for (const day of Object.keys(days)) {
      out[day] = diffArray(out[day], days[day]);
    }
  }
  return Object.keys(out).map((day) => ({ DAY: day, ...out[day] }));
};

const getScheduleTypes = (schedules) => {
  const buildings = Object.keys(schedules);
  if (!buildings.length) return [];
  try {
    return Object.keys(schedules[buildings[0]].SCHEDULES);
  } catch (error) {
    console.error(error);
    return [];
  }
};

const diffArray = (first, second) => {
  if (typeof first == 'undefined' || !first.length) return second;
  return first.map((value, index) => {
    if (value == second[index]) return value;
    return 'DIFF';
  });
};

export default ScheduleEditor;

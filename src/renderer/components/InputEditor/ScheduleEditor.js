import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchBuildingSchedule,
  setSelected,
  updateDaySchedule,
  updateYearSchedule
} from '../../actions/inputEditor';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './ScheduleEditor.css';
import { months_short } from '../../constants/months';
import { Tabs, Spin } from 'antd';

const ScheduleEditor = ({ selected, schedules, tabulator }) => {
  const { tables } = useSelector(state => state.inputData);
  const [tab, setTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const buildings = Object.keys(tables.zone || {});
  const dispatch = useDispatch();
  const divRef = useRef(null);

  const selectRow = (e, cell) => {
    const row = cell.getRow();
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
  };

  // Initialize table
  useEffect(() => {
    const filtered = tabulator.current && tabulator.current.getFilters().length;
    tabulator.current = new Tabulator(divRef.current, {
      data: buildings.sort().map(building => ({ Name: building })),
      index: 'Name',
      columns: [{ title: 'Name', field: 'Name' }],
      layout: 'fitColumns',
      height: '300px',
      cellClick: selectRow
    });
    filtered && tabulator.current.setFilter('Name', 'in', selected);
  }, []);

  useEffect(() => {
    const buildings = Object.keys(tables.zone || {});
    tabulator.current &&
      tabulator.current.replaceData(
        buildings.sort().map(building => ({ Name: building }))
      );
    tabulator.current.redraw();
  }, [tables]);

  useEffect(() => {
    tabulator.current && tabulator.current.deselectRow();
    if (buildings.includes(selected[0])) {
      tabulator.current && tabulator.current.selectRow(selected);
      setLoading(true);
      dispatch(fetchBuildingSchedule(selected))
        .catch(error => {
          console.log(error);
          setErrors(error);
        })
        .finally(() => {
          setLoading(false);
        });
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
                {Object.keys(errors).map(building => (
                  <div
                    key={building}
                  >{`${building}: ${errors[building].message}`}</div>
                ))}
              </div>
            ) : (
              <React.Fragment>
                <div className="cea-schedule-year">
                  <YearTable selected={selected} schedules={schedules} />
                </div>
                <div className="cea-schedule-data">
                  <DataTable
                    selected={selected}
                    tab={tab}
                    schedules={schedules}
                  />
                </div>
                <div className="cea-schedule-tabs">
                  <ScheduleTab
                    tab={tab}
                    setTab={setTab}
                    schedules={schedules}
                  />
                </div>
              </React.Fragment>
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

const DataTable = ({ selected, tab, schedules }) => {
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
        ...[...Array(24).keys()].map(i => ({
          title: i.toString(),
          field: i.toString(),
          headerSort: false,
          editor: 'input',
          // Hack to allow editing when double clicking
          cellDblClick: () => {},
          formatter: cell => {
            formatCellStyle(cell);
            return cell.getValue();
          }
        }))
      ],
      cellEdited: cell => {
        formatCellStyle(cell);
        dispatch(
          updateDaySchedule(
            tooltipsRef.current.selected,
            tooltipsRef.current.tab,
            cell.getData().DAY,
            cell.getField(),
            cell.getValue()
          )
        );
      },
      layoutColumnsOnNewData: true,
      layout: 'fitDataFill',
      tooltips: cell => {
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
      }
    });
  }, []);

  useEffect(() => {
    tooltipsRef.current = { selected, schedules, tab };
    tabulator.current &&
      tab &&
      selected.length &&
      selected.every(building => Object.keys(schedules).includes(building)) &&
      tabulator.current.setData(parseData(schedules, selected, tab));
  }, [selected, schedules, tab]);

  return <div ref={divRef} />;
};

const YearTable = ({ selected, schedules }) => {
  const tabulator = useRef(null);
  const divRef = useRef(null);
  const tooltipsRef = useRef({ selected, schedules });
  const dispatch = useDispatch();

  useEffect(() => {
    console.log('render year');
    tabulator.current = new Tabulator(divRef.current, {
      data: [],
      index: 'name',
      columns: [
        { title: '', field: 'name', headerSort: false },
        ...[...Array(12).keys()].map(i => ({
          title: months_short[i],
          field: i.toString(),
          headerSort: false,
          editor: 'input',
          // Hack to allow editing when double clicking
          cellDblClick: () => {},
          formatter: cell => {
            formatCellStyle(cell);
            return cell.getValue();
          }
        }))
      ],
      cellEdited: cell => {
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
      tooltips: cell => {
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
      }
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
    tabulator.current &&
      selected.length &&
      selected.every(building => Object.keys(schedules).includes(building)) &&
      tabulator.current.setData(parseYearData(schedules, selected));
  }, [schedules, selected]);

  return <div ref={divRef} />;
};

const ScheduleTab = ({ tab, setTab, schedules }) => {
  const TabPanes = getScheduleTypes(schedules).map(schedule => (
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

const formatCellStyle = cell => {
  if (cell.getValue() == 'DIFF') {
    cell.getElement().style.fontWeight = 'bold';
    cell.getElement().style.fontStyle = 'italic';
  } else {
    cell.getElement().style.fontWeight = 'normal';
    cell.getElement().style.fontStyle = 'normal';
  }
};

const parseYearData = (schedules, selected) => {
  let out = [];
  for (const building of selected) {
    const buildingSchedule = schedules[building].MONTHLY_MULTIPLIER;
    out = diffArray(out, buildingSchedule);
  }
  console.log(out);
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
  console.log(out);
  return Object.keys(out).map(day => ({ DAY: day, ...out[day] }));
};

const getScheduleTypes = schedules => {
  const buildings = Object.keys(schedules);
  if (!buildings.length) return [];
  try {
    return Object.keys(schedules[buildings[0]].SCHEDULES);
  } catch (error) {
    console.log(error);
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

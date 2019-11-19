import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchBuildingSchedule, setSelected } from '../../actions/inputEditor';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './ScheduleEditor.css';
import { months_short } from '../../constants/months';
import { Tabs, Spin, Button, Card } from 'antd';

const ScheduleEditor = () => {
  const { selected, tables } = useSelector(state => state.inputData);
  const [tab, setTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const buildings = Object.keys(tables.zone || {});
  const dispatch = useDispatch();
  const tabulator = useRef(null);
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
    tabulator.current = new Tabulator(divRef.current, {
      data: buildings.map(building => ({ Name: building })),
      index: 'Name',
      columns: [{ title: 'Name', field: 'Name' }],
      layout: 'fitColumns',
      height: '300px',
      cellClick: selectRow
    });
    tabulator.current.setSort('Name', 'asc');
  }, []);

  useEffect(() => {
    if (buildings.includes(selected[0])) {
      if (tabulator.current) {
        tabulator.current.deselectRow();
        tabulator.current.selectRow(selected);
        tabulator.current.getFilters().length &&
          tabulator.current.setFilter('Name', 'in', selected);
      }
      if (selected.length) {
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
    } else tabulator.current && tabulator.current.deselectRow();
  }, [selected]);

  if (!buildings.length) return <div>No buildings found</div>;

  return (
    <Card
      headStyle={{ backgroundColor: '#f1f1f1' }}
      size="small"
      extra={<TableButtons selected={selected} tabulator={tabulator} />}
    >
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
                    <YearTable selected={selected} />
                  </div>
                  <div className="cea-schedule-data">
                    <DataTable selected={selected} tab={tab} />
                  </div>
                  <div className="cea-schedule-tabs">
                    <ScheduleTab tab={tab} setTab={setTab} />
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
    </Card>
  );
};

const DataTable = ({ selected, tab }) => {
  const { schedules } = useSelector(state => state.inputData);
  const tabulator = useRef(null);
  const divRef = useRef(null);

  const parseData = (building, tab) => {
    const buildingSchedule = schedules[building];
    if (!buildingSchedule || !tab) return [];
    const days = buildingSchedule.SCHEDULES[tab];
    return Object.keys(days).map(day => ({ DAY: day, ...days[day] }));
  };

  useEffect(() => {
    tabulator.current = new Tabulator(divRef.current, {
      data: [],
      index: 'DAY',
      columns: [
        { title: 'DAY \\ HOUR', field: 'DAY', width: 100, headerSort: false },
        ...[...Array(24).keys()].map(i => ({
          title: i.toString(),
          field: i.toString(),
          headerSort: false
        }))
      ],
      layoutColumnsOnNewData: true,
      layout: 'fitDataFill'
    });
  }, []);

  useEffect(() => {
    tabulator.current && tabulator.current.setData(parseData(selected[0], tab));
  }, [selected, schedules, tab]);

  return <div ref={divRef} />;
};

const YearTable = ({ selected }) => {
  const { schedules } = useSelector(state => state.inputData);
  const tabulator = useRef(null);
  const divRef = useRef(null);

  useEffect(() => {
    console.log('render year');
    tabulator.current = new Tabulator(divRef.current, {
      data: parseYearData(schedules, selected),
      index: 'name',
      columns: [
        { title: '', field: 'name', headerSort: false },
        ...[...Array(12).keys()].map(i => ({
          title: months_short[i],
          field: i.toString(),
          headerSort: false
        }))
      ],
      layout: 'fitDataFill'
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
    tabulator.current &&
      tabulator.current.setData(parseYearData(schedules, selected));
  }, [schedules, selected]);

  return <div ref={divRef} />;
};

const ScheduleTab = ({ tab, setTab }) => {
  const { schedules } = useSelector(state => state.inputData);
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

const TableButtons = ({ selected, tabulator }) => {
  const [filterToggle, setFilterToggle] = useState(false);
  const dispatch = useDispatch();

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

  return (
    <div>
      <Button onClick={selectAll}>Select All</Button>
      <Button
        type={filterToggle ? 'primary' : 'default'}
        onClick={filterSelected}
      >
        Filter on Selection
      </Button>
      {selected.length ? (
        <Button onClick={clearSelected}>Clear Selection</Button>
      ) : null}
    </div>
  );
};

const parseYearData = (schedules, selected) => {
  if (
    !selected.length ||
    !selected.every(building => Object.keys(schedules).includes(building))
  )
    return [];
  for (const building of selected) {
    const buildingSchedule = schedules[building].MONTHLY_MULTIPLIER;
  }

  return [
    { name: 'MONTHLY_MULTIPLIER', ...schedules[selected[0]].MONTHLY_MULTIPLIER }
  ];
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

export default ScheduleEditor;

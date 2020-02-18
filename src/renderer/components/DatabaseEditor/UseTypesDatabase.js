import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Tabs, Button, Modal } from 'antd';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import './DatabaseEditor.css';
import { copyScheduleData } from '../../actions/databaseEditor';
import Table, { useTableUpdateRedux } from './Table';
import { months_short } from '../../constants/months';
import NewScheduleModal from './NewScheduleModal';

const UseTypesDatabase = ({ name, data, schema }) => {
  const useTypes = Object.keys(data['SCHEDULES']);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedKey, setSelected] = useState(useTypes[0]);
  const [panes, setPanes] = useState(useTypes);
  const dispatch = useDispatch();

  const showModal = () => {
    setModalVisible(true);
  };

  const onEdit = (targetKey, action) => {
    if (action === 'remove') {
      Modal.confirm({
        title: `Do you want to delete ${targetKey} schedule?`,
        content: 'This action cannot be undone.',
        onOk() {
          setSelected(null);
          setPanes(oldValue => oldValue.filter(pane => pane != targetKey));
        }
      });
    }
  };

  const addSchedule = values => {
    const { name, copy } = values;
    dispatch(copyScheduleData(name, copy));
    setPanes(oldValue => [...oldValue, name]);
    setSelected(name);
  };

  return (
    <React.Fragment>
      <Tabs
        className="cea-database-editor-tabs"
        type="editable-card"
        onEdit={onEdit}
        hideAdd
        activeKey={selectedKey}
        onChange={setSelected}
        tabBarExtraContent={
          <Button onClick={showModal}>Add new Use-Type</Button>
        }
      >
        {panes.map(pane => (
          <Tabs.TabPane key={pane} tab={pane}>
            <SchedulesTable
              databaseName={name}
              sheetName={pane}
              sheetData={data['SCHEDULES'][pane]}
              schema={schema}
            />
          </Tabs.TabPane>
        ))}
      </Tabs>
      <NewScheduleModal
        scheduleNames={useTypes}
        onSuccess={values => {
          addSchedule(values);
        }}
        visible={modalVisible}
        setVisible={setModalVisible}
      />
    </React.Fragment>
  );
};

const SchedulesTable = ({ databaseName, sheetName, sheetData, schema }) => {
  return (
    <div className="cea-database-editor-schedules-sheet">
      <p>Yearly/Month</p>
      <SchedulesYearTable
        databaseName={databaseName}
        sheetName={sheetName}
        yearData={sheetData['MONTHLY_MULTIPLIER']}
      />
      <p>Day/Hour</p>
      <SchedulesTypeTab
        databaseName={databaseName}
        sheetName={sheetName}
        scheduleData={sheetData['SCHEDULES']}
      />
    </div>
  );
};

const SchedulesTypeTab = ({ databaseName, sheetName, scheduleData }) => {
  const [selectedType, setSelected] = useState(Object.keys(scheduleData)[0]);
  return (
    <div>
      <SchedulesDataTable
        databaseName={databaseName}
        sheetName={sheetName}
        scheduleType={selectedType}
        data={scheduleData[selectedType]}
      />
      <Tabs
        className="cea-database-editor-tabs"
        size="small"
        animated={false}
        tabPosition="bottom"
        activeKey={selectedType}
        onChange={setSelected}
      >
        {Object.keys(scheduleData).map(scheduleType => (
          <Tabs.TabPane key={scheduleType} tab={scheduleType}></Tabs.TabPane>
        ))}
      </Tabs>
    </div>
  );
};

const fractionFloatValidator = (value, callback) => {
  try {
    if (Number(value) >= 0 && Number(value) <= 1) callback(true);
    else callback(false);
  } catch (error) {
    callback(false);
  }
};

const SchedulesYearTable = ({ databaseName, sheetName, yearData }) => {
  const tableRef = useRef();
  const updateRedux = useTableUpdateRedux(tableRef, databaseName, sheetName);
  const colHeaders = Object.keys(yearData).map(i => months_short[i]);
  const columns = Object.keys(colHeaders).map(key => ({
    data: Number(key),
    type: 'numeric',
    validator: fractionFloatValidator
  }));

  //  Revalidate cells on sheet change
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, [sheetName]);

  return (
    <div className="cea-database-editor-schedule-year">
      <Table
        ref={tableRef}
        id={`${databaseName}-${sheetName}-year`}
        data={[yearData]}
        rowHeaders="MONTHLY_MULTIPLIER"
        rowHeaderWidth={180}
        colHeaders={colHeaders}
        columns={columns}
        // stretchH="all"
        height={70}
      />
    </div>
  );
};

const SchedulesDataTable = ({
  databaseName,
  sheetName,
  scheduleType,
  data
}) => {
  const tableRef = useRef();
  const updateRedux = useTableUpdateRedux(
    tableRef,
    databaseName,
    `${sheetName}-${scheduleType}`
  );
  const rowHeaders = Object.keys(data);
  const tableData = rowHeaders.map(row => data[row]);
  const colHeaders = Object.keys(tableData[0]).map(i => Number(i) + 1);
  const columns = Object.keys(colHeaders).map(key => {
    // FIXME: Temp solution
    if (['HEATING', 'COOLING'].includes(scheduleType)) {
      return { data: key };
    } else return { data: key, type: 'numeric' };
  });

  //  Revalidate cells on sheet and type change
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, [sheetName, scheduleType]);

  return (
    <div className="cea-database-editor-schedule-data">
      <Table
        ref={tableRef}
        id={`${databaseName}-${sheetName}-data`}
        data={tableData}
        rowHeaders={rowHeaders}
        rowHeaderWidth={80}
        colHeaders={colHeaders}
        columns={columns}
        // stretchH="all"
        height={120}
      />
    </div>
  );
};

export default withErrorBoundary(UseTypesDatabase);

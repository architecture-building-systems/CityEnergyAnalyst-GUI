import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Tabs, Button, Modal, Select } from 'antd';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import './DatabaseEditor.css';
import Table, { useTableUpdateRedux } from './Table';
import { months_short } from '../../constants/months';
import { useChangeRoute } from '../Project/Project';
import routes from '../../constants/routes';

const UseTypesDatabase = ({ name, data, schema }) => {
  const useTypes = Object.keys(data['SCHEDULES']);
  const [selectedType, setSelected] = useState(useTypes[0]);
  const [choices, setChoices] = useState(useTypes);
  const goToScript = useChangeRoute(`${routes.TOOLS}/create-mixed-use-type`);
  const dispatch = useDispatch();

  return (
    <React.Fragment>
      <div className="cea-database-editor-use-types">
        <Select
          onSelect={setSelected}
          value={selectedType}
          style={{ width: 250 }}
        >
          {choices.map(choice => (
            <Select.Option key={choice} value={choice}>
              {choice}
            </Select.Option>
          ))}
        </Select>
        <Button onClick={goToScript}>Add new Use-Type</Button>
      </div>
      <UseTypesTable
        databaseName={name}
        useTypeName={selectedType}
        useTypeData={data}
        schema={schema}
      />
    </React.Fragment>
  );
};

const UseTypesTable = ({ databaseName, useTypeName, useTypeData, schema }) => {
  return (
    <div className="cea-database-editor-use-types">
      <div>
        <b>METADATA:</b> {useTypeData['SCHEDULES'][useTypeName]['METADATA']}
      </div>
      <h3>Properties</h3>
      {Object.keys(useTypeData['USE_TYPE_PROPERTIES']).map(property => (
        <UseTypePropertyTable
          key={`${useTypeName}-${property}`}
          databaseName={databaseName}
          sheetName={useTypeName}
          property={property}
          propertyData={
            useTypeData['USE_TYPE_PROPERTIES'][property][useTypeName]
          }
        />
      ))}
      <h3>Schedules</h3>
      <SchedulesYearTable
        databaseName={databaseName}
        sheetName={useTypeName}
        yearData={useTypeData['SCHEDULES'][useTypeName]['MONTHLY_MULTIPLIER']}
      />
      <SchedulesTypeTab
        databaseName={databaseName}
        sheetName={useTypeName}
        scheduleData={useTypeData['SCHEDULES'][useTypeName]['SCHEDULES']}
      />
    </div>
  );
};

const UseTypePropertyTable = ({
  databaseName,
  sheetName,
  property,
  propertyData
}) => {
  const tableRef = useRef();
  const updateRedux = useTableUpdateRedux(tableRef, databaseName, sheetName);
  const colHeaders = Object.keys(propertyData);
  const columns = colHeaders.map(key => ({
    data: key,
    type: 'numeric'
  }));

  //  Revalidate cells on sheet change
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, [sheetName]);

  return (
    <div className={`cea-database-editor-schedule-${property}`}>
      <Table
        ref={tableRef}
        id={`${databaseName}-${sheetName}-${property}`}
        data={[propertyData]}
        rowHeaders={property}
        rowHeaderWidth={180}
        colHeaders={colHeaders}
        columns={columns}
        // stretchH="all"
        height={70}
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
      <p>Yearly/Month</p>
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
      return {
        data: key,
        type: 'dropdown',
        source: ['OFF', 'SETBACK', 'SETPOINT']
      };
    } else
      return { data: key, type: 'numeric', validator: fractionFloatValidator };
  });

  //  Revalidate cells on sheet and type change
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, [sheetName, scheduleType]);

  return (
    <div className="cea-database-editor-schedule-data">
      <p>Day/Hour</p>
      <Table
        ref={tableRef}
        id={`${databaseName}-${sheetName}-data`}
        data={tableData}
        rowHeaders={rowHeaders}
        rowHeaderWidth={80}
        colHeaders={colHeaders}
        columns={columns}
        colWidths={['HEATING', 'COOLING'].includes(scheduleType) ? 90 : 50}
        height={190}
        // stretchH="all"
      />
    </div>
  );
};

export default withErrorBoundary(UseTypesDatabase);

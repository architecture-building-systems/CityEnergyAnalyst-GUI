import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { Tabs, Button, Select } from 'antd';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import './DatabaseEditor.css';
import Table from './Table';
import { months_short } from '../../constants/months';
import { useChangeRoute } from '../Project/Project';
import routes from '../../constants/routes';

const UseTypesDatabase = ({ category, name, schema, glossary }) => {
  const useTypeData = useSelector(
    state => state.databaseEditor.data.present[category][name]
  );
  const useTypes = Object.keys(useTypeData['SCHEDULES']);
  const [selectedType, setSelected] = useState(useTypes[0]);
  const goToScript = useChangeRoute(`${routes.TOOLS}/create-mixed-use-type`);

  return (
    <React.Fragment>
      <div className="cea-database-editor-use-types">
        <Select
          onSelect={setSelected}
          value={selectedType}
          style={{ width: 250 }}
        >
          {useTypes.map(choice => (
            <Select.Option key={choice} value={choice}>
              {choice}
            </Select.Option>
          ))}
        </Select>
        <Button onClick={goToScript}>Add new Use-Type</Button>
      </div>
      <UseTypesContainer
        category={category}
        databaseName={name}
        useTypeName={selectedType}
        useTypeData={useTypeData}
        schema={schema}
      />
    </React.Fragment>
  );
};

const UseTypesContainer = ({
  category,
  databaseName,
  useTypeName,
  useTypeData,
  schema
}) => {
  const useTypePropertyNames = Object.keys(useTypeData['USE_TYPE_PROPERTIES']);
  return (
    <div className="cea-database-editor-use-types">
      <div>
        <b>METADATA:</b> {useTypeData['SCHEDULES'][useTypeName]['METADATA']}
      </div>
      <h3>Properties</h3>
      {useTypePropertyNames.map(property => (
        <UseTypePropertyTable
          key={`${useTypeName}-${property}`}
          category={category}
          databaseName={databaseName}
          tableName={useTypeName}
          property={property}
          propertyData={
            useTypeData['USE_TYPE_PROPERTIES'][property][useTypeName]
          }
        />
      ))}
      <h3>Schedules</h3>
      <SchedulesYearTable
        category={category}
        databaseName={databaseName}
        tableName={useTypeName}
        yearData={useTypeData['SCHEDULES'][useTypeName]['MONTHLY_MULTIPLIER']}
      />
      <SchedulesTypeTab
        category={category}
        databaseName={databaseName}
        tableName={useTypeName}
        scheduleData={useTypeData['SCHEDULES'][useTypeName]['SCHEDULES']}
      />
    </div>
  );
};

const UseTypePropertyTable = ({
  category,
  databaseName,
  tableName,
  property,
  propertyData
}) => {
  const tableRef = useRef();
  const colHeaders = Object.keys(propertyData);
  const columns = colHeaders.map(key => ({
    data: key,
    type: 'numeric'
  }));

  //  Revalidate cells on sheet change
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, [tableName]);

  return (
    <div className={`cea-database-editor-schedule-${property}`}>
      <Table
        ref={tableRef}
        id={`${databaseName}-${tableName}-${property}`}
        category={category}
        databaseName={databaseName}
        tableName={tableName}
        dataLocator={['USE_TYPE_PROPERTIES', property, tableName]}
        data={[propertyData]}
        rowHeaders={[property]}
        rowHeaderWidth={180}
        colHeaders={colHeaders}
        columns={columns}
        // stretchH="all"
        height={70}
      />
    </div>
  );
};

const SchedulesTypeTab = ({
  category,
  databaseName,
  tableName,
  scheduleData
}) => {
  const [selectedType, setSelected] = useState(Object.keys(scheduleData)[0]);
  return (
    <div>
      <SchedulesDataTable
        category={category}
        databaseName={databaseName}
        tableName={tableName}
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

const SchedulesYearTable = ({
  category,
  databaseName,
  tableName,
  yearData
}) => {
  const tableRef = useRef();
  const colHeaders = Object.keys(yearData).map(i => months_short[i]);
  const columns = Object.keys(colHeaders).map(key => ({
    data: Number(key),
    type: 'numeric',
    validator: fractionFloatValidator
  }));

  //  Revalidate cells on sheet change
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, [tableName]);

  return (
    <div className="cea-database-editor-schedule-year">
      <p>Yearly/Month</p>
      <Table
        ref={tableRef}
        id={`${databaseName}-${tableName}-year`}
        category={category}
        databaseName={databaseName}
        tableName={tableName}
        dataLocator={['SCHEDULES', tableName]}
        data={[yearData]}
        rowHeaders={['MONTHLY_MULTIPLIER']}
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
  category,
  databaseName,
  tableName,
  scheduleType,
  data
}) => {
  const tableRef = useRef();
  const rowHeaders = Object.keys(data);
  const tableData = rowHeaders.map(row => data[row]);
  const colHeaders = Object.keys(tableData[0]);
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
  }, [tableName, scheduleType]);

  return (
    <div className="cea-database-editor-schedule-data">
      <p>Day/Hour</p>
      <Table
        ref={tableRef}
        id={`${databaseName}-${tableName}-data`}
        category={category}
        databaseName={databaseName}
        tableName={tableName}
        dataLocator={['SCHEDULES', tableName, 'SCHEDULES', scheduleType]}
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

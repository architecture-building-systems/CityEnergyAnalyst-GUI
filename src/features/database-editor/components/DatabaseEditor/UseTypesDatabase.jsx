import { useState, useEffect, useRef } from 'react';
import { Tabs, Button, Select } from 'antd';
import { withErrorBoundary } from 'utils/ErrorBoundary';
import './DatabaseEditor.css';
import Table from './Table';
import routes from 'constants/routes.json';
import { getTableSchema } from './Database';
import { useChangeRoute } from 'utils/hooks';

const UseTypesDatabase = ({ name, data, schema }) => {
  const useTypes = Object.keys(data['SCHEDULES']);
  const [selectedType, setSelected] = useState(useTypes[0]);
  const goToScript = useChangeRoute(`${routes.TOOLS}/create-mixed-use-type`);

  return (
    <>
      <div className="cea-database-editor-use-types">
        <Select
          onSelect={setSelected}
          value={selectedType}
          style={{ width: 250 }}
        >
          {useTypes.map((choice) => (
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
    </>
  );
};

const UseTypesTable = ({ databaseName, useTypeName, useTypeData, schema }) => {
  const { METADATA, MONTHLY_MULTIPLIER, ...others } =
    useTypeData['SCHEDULES'][useTypeName];
  return (
    <div className="cea-database-editor-use-types">
      <div>
        <b>METADATA:</b> {METADATA[0].metadata}
      </div>
      <h3>Properties</h3>
      {Object.keys(useTypeData['USE_TYPE_PROPERTIES']).map((property) => (
        <UseTypePropertyTable
          key={`${useTypeName}-${property}`}
          databaseName={databaseName}
          sheetName={useTypeName}
          property={property}
          propertyData={useTypeData['USE_TYPE_PROPERTIES'][property]}
          schema={schema[property]}
        />
      ))}
      <h3>Schedules</h3>
      <SchedulesYearTable
        databaseName={databaseName}
        sheetName={useTypeName}
        yearData={MONTHLY_MULTIPLIER}
        schema={schema['MONTHLY_MULTIPLIER']}
      />
      <SchedulesTypeTab
        databaseName={databaseName}
        sheetName={useTypeName}
        scheduleData={others}
        schema={schema}
      />
    </div>
  );
};

const UseTypePropertyTable = ({
  databaseName,
  sheetName,
  property,
  propertyData,
  schema,
}) => {
  const tableRef = useRef();
  const tableData = [propertyData.find((data) => data.code == sheetName)];
  const { columns, colHeaders } = getTableSchema(
    schema,
    sheetName,
    tableData,
    null,
    Object.keys(tableData[0]).filter((row) => row !== 'code'),
  );

  //  Revalidate cells on sheet change
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, [sheetName]);

  return (
    <div className={`cea-database-editor-schedule-${property}`}>
      <Table
        ref={tableRef}
        id={`${databaseName}-${sheetName}-${property}`}
        data={tableData}
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

const SchedulesTypeTab = ({
  databaseName,
  sheetName,
  scheduleData,
  schema,
}) => {
  const [selectedType, setSelected] = useState(Object.keys(scheduleData)[0]);
  return (
    <div>
      <SchedulesDataTable
        databaseName={databaseName}
        sheetName={sheetName}
        scheduleType={selectedType}
        data={scheduleData[selectedType]}
        schema={schema[selectedType]}
      />
      <Tabs
        className="cea-database-editor-tabs"
        size="small"
        animated={false}
        tabPosition="bottom"
        activeKey={selectedType}
        onChange={setSelected}
        items={Object.keys(scheduleData).map((scheduleType) => ({
          key: scheduleType,
          label: scheduleType,
        }))}
      />
    </div>
  );
};

const SchedulesYearTable = ({ databaseName, sheetName, yearData, schema }) => {
  const tableRef = useRef();
  const { columns, colHeaders } = getTableSchema(
    schema,
    sheetName,
    yearData,
    null,
  );

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
        data={yearData}
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
  databaseName,
  sheetName,
  scheduleType,
  data,
  schema,
}) => {
  const tableRef = useRef();
  const rowHeaders = data.map((row) => row['DAY']);
  const { columns, colHeaders } = getTableSchema(
    schema,
    sheetName,
    data,
    null,
    Object.keys(data[0]).filter((col) => col !== 'DAY'),
  );

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
        data={data}
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

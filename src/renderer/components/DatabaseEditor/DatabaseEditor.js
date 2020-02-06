import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { Tabs, Icon, Button, Modal } from 'antd';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import CenterSpinner from '../HomePage/CenterSpinner';
import './DatabaseEditor.css';
import {
  fetchDatabase,
  resetDatabaseState
} from '../../actions/databaseEditor';
import Table, { TableButtons, useTableUpdateRedux } from './Table';
import { months_short } from '../../constants/months';
import { AsyncError } from '../../utils';

const useFetchDatabaseTypes = () => {
  const [dbNames, setDBNames] = useState([]);

  useEffect(() => {
    const fetchDBNames = async () => {
      try {
        const resp = await axios.get('http://localhost:5050/api/databases/');
        setDBNames(resp.data.databases);
      } catch (err) {
        console.log(err);
      }
    };
    fetchDBNames();
  }, []);

  return dbNames;
};

const ValidationErrors = () => {
  const validation = useSelector(state => state.databaseData.validation);

  return (
    <div>
      {validation.length ? (
        <div>
          <h1>Errors</h1>
          {validation.map(error => {
            const { id, row, column } = error;
            return (
              <p key={`${id}-${row}-${column}`}>{JSON.stringify(error)}</p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const SavingDatabaseModal = ({ visible, hideModal, error }) => {
  return (
    <Modal
      visible={visible}
      width={800}
      footer={false}
      onCancel={hideModal}
      closable={false}
      maskClosable={false}
      destroyOnClose={true}
    >
      {error ? (
        <div>
          <AsyncError error={error} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={hideModal}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div>
          <Icon type="loading" style={{ color: 'blue', margin: 5 }} />
          <span>Saving Databases</span>
        </div>
      )}
    </Modal>
  );
};

const DatabaseEditor = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);
  const dbTypes = useFetchDatabaseTypes();
  const dispatch = useDispatch();

  useEffect(() => {
    return () => {
      dispatch(resetDatabaseState());
    };
  }, []);

  const hideModal = () => {
    setModalVisible(false);
    setError(null);
  };

  const saveDB = async () => {
    setModalVisible(true);
    try {
      console.log('done');
    } catch (err) {
      console.log(err.response);
      setError(err.response);
    }
  };

  return (
    <div>
      <h2>Database Editor</h2>
      <ValidationErrors />
      {Object.keys(dbTypes).length ? (
        <div>
          <h1>Database Category</h1>
          <Tabs
            className="cea-database-editor-tabs"
            size="small"
            tabPosition="left"
            animated={false}
          >
            {Object.keys(dbTypes).map(dbType => (
              <Tabs.TabPane key={dbType} tab={dbType.toUpperCase()}>
                <h1>Databases</h1>
                <DatabaseTypeTabs dbType={dbTypes[dbType]} />
              </Tabs.TabPane>
            ))}
          </Tabs>
        </div>
      ) : null}
      <SavingDatabaseModal
        visible={modalVisible}
        hideModal={hideModal}
        error={error}
      />
      <Button onClick={saveDB}>Save Databases</Button>
    </div>
  );
};

const DatabaseTypeTabs = ({ dbType }) => {
  return (
    <Tabs className="cea-database-editor-tabs" size="small" animated={false}>
      {dbType.map(dbName => (
        <Tabs.TabPane key={dbName} tab={dbName}>
          <DatabaseTabs dbName={dbName} />
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
};

const DatabaseTabs = ({ dbName }) => {
  const databaseData = useSelector(state => state.databaseData);
  const dispatch = useDispatch();

  const fetchDB = () => {
    dispatch(fetchDatabase(dbName));
  };

  useEffect(() => {
    fetchDB();
  }, []);

  if (typeof databaseData[dbName] === 'undefined') return null;
  const { status, error, data, schema } = databaseData[dbName];
  if (status === 'fetching')
    return (
      <CenterSpinner
        indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
        tip="Reading Database..."
      />
    );
  if (status === 'failed') return <div>Error</div>;
  return (
    <div>
      <h1>Types</h1>
      <Tabs
        className="cea-database-editor-tabs"
        type="card"
        tabBarExtraContent={<Button onClick={fetchDB}>Refetch database</Button>}
      >
        {Object.keys(data).map(sheetName => (
          <Tabs.TabPane key={`${dbName}-${sheetName}`} tab={sheetName}>
            {dbName !== 'schedules' ? (
              <Sheet
                databaseName={dbName}
                sheetName={sheetName}
                sheetData={data[sheetName]}
                schema={schema[sheetName]}
              />
            ) : (
              <SchedulesSheet
                databaseName={dbName}
                sheetName={sheetName}
                sheetData={data[sheetName]}
                schema={schema[sheetName]}
              />
            )}
          </Tabs.TabPane>
        ))}
      </Tabs>
    </div>
  );
};

const useTableSchema = (tableRef, schema, tableData) => {
  const colHeaders = Object.keys(tableData[0]);
  const columns = colHeaders.map(key => {
    if (schema[key]['types_found']) {
      if (['long', 'float', 'int'].includes(schema[key]['types_found'][0]))
        return { data: key, type: 'numeric' };
    }
    return { data: key };
  });
  return { columns, colHeaders };
};

const Sheet = ({ databaseName, sheetName, sheetData, schema }) => {
  const tableRef = useRef(null);
  const updateRedux = useTableUpdateRedux(tableRef);
  const { columns, colHeaders } = useTableSchema(tableRef, schema, sheetData);

  return (
    <div className="cea-database-editor-sheet">
      <Table
        ref={tableRef}
        id={`${databaseName}-${sheetName}`}
        data={sheetData}
        colHeaders={colHeaders}
        rowHeaders={true}
        columns={columns}
        stretchH="all"
        height={500}
      />
    </div>
  );
};

const SchedulesSheet = ({ databaseName, sheetName, sheetData, schema }) => {
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
  return (
    <Tabs
      className="cea-database-editor-tabs"
      size="small"
      animated={false}
      tabPosition="bottom"
    >
      {Object.keys(scheduleData).map(scheduleType => (
        <Tabs.TabPane key={scheduleType} tab={scheduleType}>
          <SchedulesDataTable
            databaseName={databaseName}
            sheetName={sheetName}
            scheduleType={scheduleType}
            data={scheduleData[scheduleType]}
          />
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
};

const SchedulesYearTable = ({ databaseName, sheetName, yearData }) => {
  const tableRef = useRef();
  const updateRedux = useTableUpdateRedux(tableRef);
  const colHeaders = Object.keys(yearData).map(i => months_short[i]);
  const columns = Object.keys(colHeaders).map(key => ({
    data: Number(key),
    type: 'numeric',
    validator: (value, callback) => {
      try {
        if (Number(value) >= 0 && Number(value) <= 1) callback(true);
        else callback(false);
      } catch (error) {
        callback(false);
      }
    }
  }));

  return (
    <div className="cea-database-editor-schedule-year">
      <Table
        ref={tableRef}
        id={`${databaseName}-${sheetName}`}
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
  const updateRedux = useTableUpdateRedux(tableRef);
  const rowHeaders = Object.keys(data);
  const tableData = rowHeaders.map(row => data[row]);
  const colHeaders = Object.keys(tableData[0]).map(i => Number(i) + 1);
  const columns = Object.keys(colHeaders).map(key => ({
    data: Number(key)
  }));
  return (
    <div className="cea-database-editor-schedule-data">
      <Table
        ref={tableRef}
        id={`${databaseName}-${sheetName}-${scheduleType}`}
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

export default withErrorBoundary(DatabaseEditor);

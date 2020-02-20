import React, { useEffect, useRef } from 'react';
import { Tabs } from 'antd';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import './DatabaseEditor.css';
import Table, { TableButtons, useTableUpdateRedux } from './Table';
import ColumnGlossary from './ColumnGlossary';

const Database = ({ name, data, schema }) => {
  const sheetNames = Object.keys(data);

  return (
    <Tabs className="cea-database-editor-tabs" type="card">
      {sheetNames.map(sheetName => (
        <Tabs.TabPane key={`${name}-${sheetName}`} tab={sheetName}>
          <DatabaseTable
            databaseName={name}
            sheetName={sheetName}
            sheetData={data[sheetName]}
            schema={schema[sheetName]}
          />
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
};

const DatabaseTable = ({ databaseName, sheetName, sheetData, schema }) => {
  const tableRef = useRef(null);
  const updateRedux = useTableUpdateRedux(tableRef, databaseName, sheetName);
  const { columns, colHeaders } = getTableSchema(schema, sheetName, sheetData);

  // Validate cells on mount
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, []);

  return (
    <div className="cea-database-editor-sheet">
      <TableButtons tableRef={tableRef} sheetData={sheetData} />
      <ColumnGlossary tableRef={tableRef} colHeaders={colHeaders} />
      <Table
        ref={tableRef}
        id={databaseName}
        data={sheetData}
        colHeaders={colHeaders}
        rowHeaders={true}
        columns={columns}
        stretchH="all"
        height={400}
      />
    </div>
  );
};

const getTableSchema = (schema, sheetName, tableData) => {
  const colHeaders = Object.keys(tableData[0]);
  const columns = colHeaders.map(key => {
    // Try to infer type from schema, else load default
    if (
      typeof schema[key] !== 'undefined' &&
      Array.isArray(schema[key]['types_found'])
    ) {
      if (['long', 'float', 'int'].includes(schema[key]['types_found'][0])) {
        // Accept 'NA' values for air_conditioning_systems
        if (['HEATING', 'COOLING'].includes(sheetName))
          return {
            data: key,
            type: 'numeric',
            validator: (value, callback) => {
              if (value === 'NA' || !isNaN(value)) {
                callback(true);
              } else {
                callback(false);
              }
            }
          };
        else return { data: key, type: 'numeric' };
      } else return { data: key };
    } else {
      console.error(`Could not find \`${key}\` in schema`, {
        sheetName,
        schema
      });
      return { data: key };
    }
  });
  return { columns, colHeaders };
};

export default withErrorBoundary(Database);

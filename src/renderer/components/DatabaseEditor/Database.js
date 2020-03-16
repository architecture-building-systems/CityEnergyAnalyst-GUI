import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
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
  const data = useSelector(state => state.databaseEditor.data);
  const tableRef = useRef(null);
  const updateRedux = useTableUpdateRedux(tableRef, databaseName, sheetName);
  const { columns, colHeaders } = getTableSchema(
    schema,
    sheetName,
    sheetData,
    data
  );

  // Validate cells on mount
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, []);

  return (
    <div className="cea-database-editor-sheet">
      <TableButtons
        tableRef={tableRef}
        databaseName={databaseName}
        sheetName={sheetName}
      />
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

const getTableSchema = (schema, sheetName, tableData, data) => {
  const colHeaders = Object.keys(tableData[0]);
  const columns = colHeaders.map(key => {
    // Try to infer type from schema, else load default
    if (typeof schema['columns'][key] === 'undefined') {
      console.error(`Could not find \`${key}\` in schema`, {
        sheetName,
        schema
      });
      return { data: key };
    }

    // Set read only for primary keys
    if (
      typeof schema['columns'][key]['primary'] != 'undefined' &&
      schema['columns'][key]['primary']
    ) {
      return { data: key, unique: true };
    }

    // Return dropdown if column is a choice
    if (typeof schema['columns'][key]['choice'] != 'undefined') {
      // Return list of values if found
      if (typeof schema['columns'][key]['choice']['values'] != 'undefined')
        return {
          data: key,
          type: 'dropdown',
          source: schema['columns'][key]['choice']['values']
        };
      // Get list from data
      if (typeof schema['columns'][key]['choice']['lookup'] != 'undefined') {
        const { database_category, database_name, sheet, column } = schema[
          'columns'
        ][key]['choice']['lookup'];
        const lookup = data[database_category][database_name][sheet];
        const choices = lookup.map(row => row[column]);
        return { data: key, type: 'dropdown', source: choices };
      }
    }

    if (['long', 'float', 'int'].includes(schema['columns'][key]['type'])) {
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
    } else if (schema['columns'][key]['type'] == 'boolean')
      return { data: key, type: 'dropdown', source: [true, false] };

    return { data: key };
  });
  console.log(columns);
  return { columns, colHeaders };
};

export default withErrorBoundary(Database);

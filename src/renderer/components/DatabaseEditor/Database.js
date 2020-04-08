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
      <ColumnGlossary
        tableRef={tableRef}
        colHeaders={colHeaders}
        filter={variable => variable.WORKSHEET == sheetName}
      />
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

export const getTableSchema = (
  schema,
  sheetName,
  tableData,
  data,
  colHeaders
) => {
  const _colHeaders = colHeaders || Object.keys(tableData[0]);
  const columns = _colHeaders.map(key => {
    const column_schema = schema['columns'][key];

    // Try to infer type from schema, else load default
    if (typeof column_schema === 'undefined') {
      console.error(`Could not find \`${key}\` in schema`, {
        sheetName,
        schema
      });
      return { data: key };
    }

    // Set read only for primary keys
    if (
      typeof column_schema['primary'] != 'undefined' &&
      column_schema['primary']
    ) {
      return { data: key, unique: true };
    }

    const choice_prop = column_schema['choice'];

    // Return dropdown if column is a choice
    if (typeof choice_prop != 'undefined') {
      // Return list of values if found
      if (typeof choice_prop['values'] != 'undefined')
        return {
          data: key,
          type: 'dropdown',
          source: choice_prop['values']
        };
      // Get list from data
      if (typeof choice_prop['lookup'] != 'undefined') {
        const { database_category, database_name, sheet, column } = choice_prop[
          'lookup'
        ];
        const lookup = data[database_category][database_name][sheet];
        const choices = lookup.map(row => row[column]);
        return { data: key, type: 'dropdown', source: choices };
      }
    }

    if (['long', 'float', 'int'].includes(column_schema['type'])) {
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
      else
        return {
          data: key,
          type: 'numeric',
          validator: (value, callback) => {
            const min = column_schema['min'];
            const max = column_schema['max'];
            if (typeof min != 'undefined' && value < min) callback(false);
            else if (typeof max != 'undefined' && value > max) callback(false);
            else callback(true);
          }
        };
    } else if (column_schema['type'] == 'boolean')
      return { data: key, type: 'dropdown', source: [true, false] };

    return { data: key };
  });
  return { columns, colHeaders: _colHeaders };
};

export default withErrorBoundary(Database);

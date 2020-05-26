import React, { useEffect, useRef } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { Tabs } from 'antd';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import './DatabaseEditor.css';
import Table, { TableButtons } from './Table';
import ColumnGlossary from './ColumnGlossary';

const Database = ({ category, name, schema, glossary }) => {
  const tableNames = useSelector(
    state => Object.keys(state.databaseEditor.data.present[category][name]),
    shallowEqual
  );
  return (
    <Tabs className="cea-database-editor-tabs" type="card">
      {tableNames.map(tableName => (
        <Tabs.TabPane key={`${name}-${tableName}`} tab={tableName}>
          <DatabaseTable
            category={category}
            databaseName={name}
            tableName={tableName}
            schema={schema}
            glossary={glossary}
          />
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
};

const DatabaseTable = ({
  category,
  databaseName,
  tableName,
  schema,
  glossary
}) => {
  const data = useSelector(state => state.databaseEditor.data.present);
  const tableRef = useRef(null);
  const tableData = useSelector(
    state =>
      state.databaseEditor.data.present[category][databaseName][tableName]
  );
  const tableSchema = schema[category][databaseName][tableName];
  const { columns, colHeaders } = getTableColumns(
    tableSchema,
    tableName,
    tableData,
    data
  );

  return (
    <div className="cea-database-editor-table">
      <TableButtons
        tableRef={tableRef}
        databaseName={databaseName}
        tableName={tableName}
        columns={columns}
      />
      <ColumnGlossary
        tableRef={tableRef}
        colHeaders={colHeaders}
        glossary={glossary}
      />
      <Table
        ref={tableRef}
        category={category}
        databaseName={databaseName}
        tableName={tableName}
        dataLocator={[tableName]}
        data={tableData}
        colHeaders={colHeaders}
        rowHeaders={true}
        columns={columns}
        stretchH="all"
        height={400}
      />
    </div>
  );
};

const getTableColumns = (schema, tableName, tableData, data) => {
  const colHeaders = Object.keys(tableData[0]);
  const columns = colHeaders.map(key => {
    // Try to infer type from schema, else load default
    if (typeof schema[key] === 'undefined') {
      console.error(`Could not find \`${key}\` in schema`, {
        tableName,
        schema
      });
      return { data: key };
    }

    // Set read only for primary keys
    if (
      typeof schema[key]['primary'] != 'undefined' &&
      schema[key]['primary']
    ) {
      return { data: key, unique: true };
    }

    // Return dropdown if column is a choice
    if (typeof schema[key]['choice'] != 'undefined') {
      // Return list of values if found
      if (typeof schema[key]['choice']['values'] != 'undefined')
        return {
          data: key,
          type: 'dropdown',
          source: schema[key]['choice']['values']
        };
      // Get list from data
      if (typeof schema[key]['choice']['lookup'] != 'undefined') {
        const { database_category, database_name, sheet, column } = schema[key][
          'choice'
        ]['lookup'];
        const lookup = data[database_category][database_name][sheet];
        const choices = lookup.map(row => row[column]);
        return { data: key, type: 'dropdown', source: choices };
      }
    }

    if (Array.isArray(schema[key]['types_found'])) {
      if (['long', 'float', 'int'].includes(schema[key]['types_found'][0])) {
        // Accept 'NA' values for air_conditioning_systems
        if (['HEATING', 'COOLING'].includes(tableName))
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
      } else if (schema[key]['types_found'][0] == 'bool')
        return { data: key, type: 'dropdown', source: [true, false] };
    }

    return { data: key };
  });

  return { columns, colHeaders };
};

export default withErrorBoundary(Database);

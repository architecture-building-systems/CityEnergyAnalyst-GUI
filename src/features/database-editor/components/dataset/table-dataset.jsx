import { useEffect, useMemo, useRef } from 'react';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './dataset.css';
import { MissingDataPrompt } from './missing-data-prompt';
import {
  useGetDatabaseColumnChoices,
  useDatabaseSchema,
} from 'features/database-editor/stores/databaseEditorStore';
import { Tooltip } from 'antd';
import { getColumnPropsFromDataType } from 'utils/tabulator';

export const TableGroupDataset = ({
  dataKey,
  data,
  indexColumn,
  commonColumns,
}) => {
  if (data == null) return <MissingDataPrompt dataKey={dataKey} />;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {Object.keys(data).map((key) => (
        <TableDataset
          key={[...dataKey, key].join('-')}
          dataKey={[...dataKey, key]}
          name={key}
          data={data?.[key]}
          indexColumn={indexColumn}
          commonColumns={commonColumns}
          showIndex={false}
        />
      ))}
    </div>
  );
};

export const TableDataset = ({
  dataKey,
  name,
  data,
  indexColumn,
  commonColumns,
  showIndex,
  freezeIndex,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {name != null && (
        <small>
          <b>{name}</b>
        </small>
      )}

      {data == null ? (
        <MissingDataPrompt dataKey={dataKey} />
      ) : (
        <>
          <EntityDetails
            data={data}
            indexColumn={indexColumn}
            commonColumns={commonColumns}
          />
          <EntityDataTable
            dataKey={dataKey}
            data={data}
            indexColumn={indexColumn}
            commonColumns={commonColumns}
            showIndex={showIndex}
            freezeIndex={freezeIndex}
          />
        </>
      )}
    </div>
  );
};

const EntityDetails = ({ data, indexColumn, commonColumns }) => {
  // Use first row to determine common columns
  const firstRow = data?.[0];
  if (firstRow == null || !commonColumns?.length) return null;

  return (
    <div>
      {commonColumns.map(
        (column) =>
          column !== indexColumn && (
            <div
              key={column}
              style={{
                display: 'flex',
                fontSize: 12,

                gap: 12,
              }}
            >
              <b style={{ flex: 1 }}>{column}</b>
              <span style={{ flex: 12 }}>{firstRow?.[column] ?? '-'}</span>
            </div>
          ),
      )}
    </div>
  );
};

const TableColumnSchema = ({ columns, columnSchema }) => {
  if (!columnSchema && !Array.isArray(columns)) return null;

  return (
    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr
            style={{
              textAlign: 'left',
              fontWeight: 'bold',
              textDecoration: 'underline',
            }}
          >
            <th>Name</th>
            <th>Unit</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => {
            const schemaInfo = columnSchema?.[col];
            const foreignKey = schemaInfo?.choice?.lookup;

            if (!schemaInfo)
              return (
                <tr key={col}>
                  <td>{col}</td>
                  <td colSpan={2}>Missing</td>
                </tr>
              );

            return (
              <tr key={col}>
                <td
                  style={{
                    maxWidth: 140,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',

                    fontFamily: 'monospace',
                  }}
                >
                  <b>{col}</b>
                  {foreignKey && (
                    <Tooltip
                      title={
                        Array.isArray(foreignKey?.path)
                          ? `${foreignKey.path
                              .map((p) => p.toUpperCase())
                              .join(
                                ' > ',
                              )}${foreignKey?.column && ` [${foreignKey.column}]`}`
                          : foreignKey?.path
                      }
                      placement="right"
                    >
                      <span
                        style={{
                          marginLeft: 4,
                          paddingInline: 4,
                          cursor: 'pointer',
                        }}
                      >
                        ↗
                      </span>
                    </Tooltip>
                  )}
                </td>
                <td>{schemaInfo?.unit}</td>
                <td>{schemaInfo?.description}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const EntityDataTable = ({
  dataKey,
  data,
  indexColumn,
  commonColumns,
  showIndex = true,
  freezeIndex = true,
}) => {
  const divRef = useRef();
  const tabulatorRef = useRef();

  const schema = useDatabaseSchema(dataKey);
  const columnSchema = schema?.columns;

  const getColumnChoices = useGetDatabaseColumnChoices();

  const firstRow = data?.[0];
  // FIXME: We are assuming that the columns from data are correct but we should use from schema instead
  // Determine columns based on first row
  const columns = useMemo(() => {
    if (firstRow == null) return [];
    // Use first row to determine columns
    return Object.keys(firstRow).filter(
      (column) =>
        (showIndex && column == indexColumn) ||
        !(commonColumns || []).includes(column),
    );
  }, [firstRow, indexColumn, commonColumns, showIndex]);

  // Convert columns to tabulator format
  const tableColumns = useMemo(() => {
    return columns.map((column) => {
      const _frozenIndex = showIndex && column == indexColumn && freezeIndex;

      const _colSchema = columnSchema?.[column];
      const colDef = {
        title: column,
        field: column,
        headerTooltip: _colSchema?.description
          ? `${_colSchema.description}${_colSchema?.unit ? ` ${_colSchema.unit}` : ''}`
          : false,
        frozen: _frozenIndex,
      };

      if (_frozenIndex) {
        colDef.cssClass = 'frozen-index';
        colDef.hozAlign = 'left';
      }

      // Handle columns with choices
      if (_colSchema?.choice != undefined) {
        const values = _colSchema?.choice?.values || [];
        const lookup = _colSchema.choice?.lookup;
        const columnChoices = lookup
          ? getColumnChoices(lookup?.path, lookup?.column)
          : values;

        return {
          ...colDef,
          editor: 'select',
          formatter: (cell) => {
            return `${cell.getValue()} <span style="float: right; color: #777; margin-left: 4px;">▼</span>`;
          },
          editorParams: {
            values: columnChoices,
            listItemFormatter: Array.isArray(columnChoices)
              ? undefined
              : (value, label) => {
                  if (!label) return value;
                  return `${value} : ${label}`;
                },
          },
        };
      }

      // Handle regular columns
      if (_colSchema?.type != undefined) {
        const dataTypeProps = getColumnPropsFromDataType(_colSchema, column);
        return { ...colDef, ...dataTypeProps };
      }

      return colDef;
    });
  }, [columns, columnSchema, indexColumn, freezeIndex, showIndex]);

  useEffect(() => {
    if (tabulatorRef.current == null) {
      tabulatorRef.current = new Tabulator(divRef.current, {
        data: data,
        columns: tableColumns,
        layout: 'fitDataFill',
        layoutColumnsOnNewData: true,
      });
    } else if (data !== null) {
      tabulatorRef.current.setColumns(tableColumns);
      tabulatorRef.current.setData(data);
      tabulatorRef.current.setHeight();
    }
  }, [data, tableColumns]);

  return (
    <>
      {columnSchema && (
        <details style={{ fontSize: 12 }}>
          <summary>Column Glossary</summary>
          <TableColumnSchema columns={columns} columnSchema={columnSchema} />
        </details>
      )}
      <div style={{ margin: 12 }} ref={divRef} />
    </>
  );
};

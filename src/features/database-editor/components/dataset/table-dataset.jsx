import { useEffect, useMemo, useRef } from 'react';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './dataset.css';
import { MissingDataPrompt } from './missing-data-prompt';
import {
  useDatabaseSchema,
  useGetDatabaseColumnChoices,
  useUpdateDatabaseData,
} from 'features/database-editor/stores/databaseEditorStore';
import { getColumnPropsFromDataType } from 'utils/tabulator';
import { TableColumnSchema } from './column-schema';

export const TableGroupDataset = ({
  dataKey,
  data,
  indexColumn,
  commonColumns,
  showColumnSchema = false,
}) => {
  const schema = useDatabaseSchema(dataKey);
  const schemaColumns = Object.keys(schema?.columns ?? {});

  if (data == null) return <MissingDataPrompt dataKey={dataKey} />;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <TableColumnSchema
        columns={schemaColumns}
        columnSchema={schema?.columns}
      />
      {Object.keys(data).map((key) => (
        <TableDataset
          key={[...dataKey, key].join('-')}
          dataKey={[...dataKey, key]}
          name={key}
          data={data?.[key]}
          indexColumn={indexColumn}
          commonColumns={commonColumns}
          showIndex={false}
          schema={schema}
          showColumnSchema={showColumnSchema}
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
  schema,
  showIndex,
  freezeIndex,
  showColumnSchema,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {name != null && (
        <small>
          <u>{name}</u>
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
            schema={schema}
            showColumnSchema={showColumnSchema}
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

const EntityDataTable = ({
  dataKey,
  data,
  schema,
  indexColumn,
  commonColumns,
  showIndex = true,
  freezeIndex = true,
  showColumnSchema = true,
}) => {
  const divRef = useRef();
  const tabulatorRef = useRef();

  const columnSchema = schema?.columns;

  const getColumnChoices = useGetDatabaseColumnChoices();
  const updateDatabaseData = useUpdateDatabaseData();

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
  const tabulatorColumns = useMemo(() => {
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

      // FIXME: Prevent edits for index column until we can implement better validation of foreign key references
      if (column == indexColumn) {
        return colDef;
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
        columns: tabulatorColumns,
        layout: 'fitDataFill',
        layoutColumnsOnNewData: true,
        index: indexColumn,
        cellEdited: (cell) => {
          const field = cell.getField();
          const value = cell.getValue();
          const index = cell.getRow().getIndex();
          const oldValue = cell.getOldValue();
          updateDatabaseData(dataKey, index, field, oldValue, value);
        },
      });
    }
  }, [data, dataKey, indexColumn, tabulatorColumns, updateDatabaseData]);

  return (
    <>
      {columnSchema && showColumnSchema && (
        <TableColumnSchema columns={columns} columnSchema={columnSchema} />
      )}
      <div style={{ margin: 12 }} ref={divRef} />
    </>
  );
};

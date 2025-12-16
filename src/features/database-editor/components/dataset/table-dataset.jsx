import { useEffect, useMemo, useRef, useImperativeHandle } from 'react';
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
  enableRowSelection,
  onRowSelectionChanged,
  ref,
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
            ref={ref}
            dataKey={dataKey}
            data={data}
            indexColumn={indexColumn}
            commonColumns={commonColumns}
            showIndex={showIndex}
            freezeIndex={freezeIndex}
            schema={schema}
            showColumnSchema={showColumnSchema}
            enableRowSelection={enableRowSelection}
            onRowSelectionChanged={onRowSelectionChanged}
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
  enableRowSelection = false,
  onRowSelectionChanged,
  ref,
}) => {
  const divRef = useRef();
  const tabulatorRef = useRef();

  // Expose specific Tabulator methods to parent components
  useImperativeHandle(
    ref,
    () => ({
      getSelectedRows: () => tabulatorRef.current?.getSelectedRows() || [],
      getSelectedData: () => tabulatorRef.current?.getSelectedData() || [],
      setData: (data) => tabulatorRef.current?.setData(data),
      selectRow: (row) => tabulatorRef.current?.selectRow(row),
      deselectRow: (row) => tabulatorRef.current?.deselectRow(row),
      getRows: () => tabulatorRef.current?.getRows() || [],
      getData: () => tabulatorRef.current?.getData() || [],
    }),
    [],
  );

  const columnSchema = schema?.columns;

  const getColumnChoices = useGetDatabaseColumnChoices();
  const updateDatabaseData = useUpdateDatabaseData();

  const schemaColumnKeys = useMemo(
    () => Object.keys(columnSchema ?? {}),
    [columnSchema],
  );

  const columnsFromSchema = useMemo(() => {
    if (schemaColumnKeys.length === 0) return [];
    const filtered = schemaColumnKeys.filter(
      (c) =>
        (showIndex && c === indexColumn) || !(commonColumns || []).includes(c),
    );
    if (showIndex && filtered.includes(indexColumn)) {
      return [indexColumn, ...filtered.filter((c) => c !== indexColumn)];
    }
    return filtered;
  }, [schemaColumnKeys, indexColumn, commonColumns, showIndex]);

  const columns = columnsFromSchema;

  // Convert columns to tabulator format
  const tabulatorColumns = useMemo(() => {
    const cols = columns.map((column) => {
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

    // Add row selection column at the beginning if enabled
    if (enableRowSelection) {
      return [
        {
          formatter: 'rowSelection',
          titleFormatter: 'rowSelection',
          hozAlign: 'center',
          headerSort: false,
          width: 40,
          frozen: true,
        },
        ...cols,
      ];
    }

    return cols;
  }, [
    columns,
    columnSchema,
    indexColumn,
    freezeIndex,
    showIndex,
    enableRowSelection,
    getColumnChoices,
  ]);

  useEffect(() => {
    if (tabulatorRef.current == null) {
      const config = {
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
      };

      // Add row selection config if enabled
      if (enableRowSelection && onRowSelectionChanged)
        config.rowSelectionChanged = onRowSelectionChanged;

      tabulatorRef.current = new Tabulator(divRef.current, config);
    }
  }, [
    data,
    dataKey,
    indexColumn,
    tabulatorColumns,
    updateDatabaseData,
    enableRowSelection,
    onRowSelectionChanged,
  ]);

  // Update table data when data changes (e.g., when a new row is added)
  useEffect(() => {
    if (tabulatorRef.current && data) {
      tabulatorRef.current.setData(data);
    }
  }, [data]);

  return (
    <>
      {columnSchema && showColumnSchema && (
        <TableColumnSchema columns={columns} columnSchema={columnSchema} />
      )}
      <div style={{ margin: 12 }} ref={divRef} />
    </>
  );
};

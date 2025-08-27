import { useEffect, useMemo, useRef } from 'react';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './dataset.css';
import { MissingDataPrompt } from './missing-data-prompt';
import { useDatabaseSchema } from 'features/database-editor/stores/databaseEditorStore';

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

  const firstRow = data?.[0];
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

  return <div style={{ margin: 12 }} ref={divRef} />;
};

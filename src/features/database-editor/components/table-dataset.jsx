import { useEffect, useMemo, useRef } from 'react';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';

export const TableGroupDataset = ({ data, indexColumn, commonColumns }) => {
  // Takes an object with keys as table names and values as arrays of objects
  if (data == null) return <div>No data found for this dataset</div>;

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
          key={key}
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

      <EntityDetails
        data={data}
        indexColumn={indexColumn}
        commonColumns={commonColumns}
      />
      <EntityDataTable
        data={data}
        indexColumn={indexColumn}
        commonColumns={commonColumns}
        showIndex={showIndex}
        freezeIndex={freezeIndex}
      />
    </div>
  );
};

const EntityDetails = ({ data, indexColumn, commonColumns }) => {
  // Use first row to determine common columns
  const firstRow = data?.[0];
  if (firstRow == null) return <div>Unable to determine entity details</div>;
  if (!commonColumns?.length) return null;

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
  data,
  indexColumn,
  commonColumns,
  showIndex = true,
  freezeIndex = true,
}) => {
  const divRef = useRef();
  const tabulatorRef = useRef();

  const firstRow = data?.[0];
  const columns = useMemo(() => {
    if (firstRow == null) return [];
    // Use first row to determine columns
    return Object.keys(firstRow)
      .filter(
        (column) =>
          (showIndex && column == indexColumn) ||
          !(commonColumns || []).includes(column),
      )
      .map((column) => {
        return {
          title: column,
          field: column,
          frozen: showIndex && column == indexColumn && freezeIndex,
        };
      });
  }, [firstRow, indexColumn, commonColumns, showIndex, freezeIndex]);

  useEffect(() => {
    if (tabulatorRef.current == null) {
      tabulatorRef.current = new Tabulator(divRef.current, {
        data: data,
        columns: columns,
        layout: 'fitDataFill',
      });
    } else if (data !== null) {
      tabulatorRef.current.setColumns(columns);
      tabulatorRef.current.setData(data);
      tabulatorRef.current.setHeight();
    }
  }, [data, columns]);

  return <div style={{ margin: 12 }} ref={divRef}></div>;
};

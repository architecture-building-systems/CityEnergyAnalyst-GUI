import { TableDataset } from './table-dataset';

const INDEX_COLUMN = 'code';

const transformData = (data) => {
  // Transfrom code dataset to table dataset
  // data is an object with keys as index and properties as objects
  // output is an array of objects with values as arrays of objects
  if (data == null) return [];

  const output = Object.keys(data).map((key) => {
    return {
      [INDEX_COLUMN]: key,
      ...(data?.[key] ?? {}),
    };
  });

  return output;
};

export const CodeTableDataset = ({ data }) => {
  if (data == null) return <div>No data selected.</div>;

  const _data = transformData(data);

  return (
    <div className="cea-database-editor-database-dataset-code">
      <TableDataset data={_data} indexColumn={INDEX_COLUMN} />
    </div>
  );
};

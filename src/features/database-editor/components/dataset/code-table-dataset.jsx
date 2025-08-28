import { useDatabaseSchema } from 'features/database-editor/stores/databaseEditorStore';
import { MissingDataPrompt } from './missing-data-prompt';
import { TableDataset } from './table-dataset';
import { arraysEqual } from 'utils';

const CONSTRUCTION_DATABASE = [
  'ARCHETYPES',
  'CONSTRUCTION',
  'construction_types',
];

const transformData = (index, data) => {
  // Transfrom code dataset to table dataset
  // data is an object with keys as index and properties as objects
  // output is an array of objects with values as arrays of objects
  if (data == null) return [];

  const output = Object.keys(data).map((key) => {
    return {
      [index]: key,
      ...(data?.[key] ?? {}),
    };
  });

  return output;
};

export const CodeTableDataset = ({ dataKey, data }) => {
  const schema = useDatabaseSchema(dataKey);
  if (data === undefined) return <div>No data selected.</div>;
  if (data === null) return <MissingDataPrompt dataKey={dataKey} />;

  const INDEX_COLUMN = arraysEqual(dataKey, CONSTRUCTION_DATABASE)
    ? 'const_type'
    : 'code';
  const _data = transformData(INDEX_COLUMN, data);

  return (
    <div className="cea-database-editor-database-dataset-code">
      <TableDataset
        key={dataKey.join('-')}
        dataKey={dataKey}
        data={_data}
        indexColumn={INDEX_COLUMN}
        schema={schema}
      />
    </div>
  );
};

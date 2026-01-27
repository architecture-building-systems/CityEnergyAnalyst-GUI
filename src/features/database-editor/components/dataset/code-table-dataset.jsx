import { useDatabaseSchema } from 'features/database-editor/stores/databaseEditorStore';
import { MissingDataPrompt } from './missing-data-prompt';
import { TableDataset } from './table-dataset';
import { arraysEqual } from 'utils';
import { useRef, useMemo } from 'react';

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
  const tabulatorRef = useRef();

  const key = dataKey.join('-');
  const INDEX_COLUMN = arraysEqual(dataKey, CONSTRUCTION_DATABASE)
    ? 'const_type'
    : 'code';

  const _data = useMemo(() => {
    const transformed = data ? transformData(INDEX_COLUMN, data) : data;
    return transformed;
  }, [INDEX_COLUMN, data]);

  if (data === undefined) return <div>No data selected.</div>;
  if (data === null) return <MissingDataPrompt dataKey={dataKey} />;

  return (
    <div className="cea-database-editor-database-dataset-code">
      <TableDataset
        ref={tabulatorRef}
        key={key}
        dataKey={dataKey}
        data={_data}
        indexColumn={INDEX_COLUMN}
        schema={schema}
        enableRowSelection={true}
        allowIndexEditing={true}
      />
    </div>
  );
};

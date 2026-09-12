import {
  useDatabaseSchema,
  MATERIALS_DATA_KEY,
} from 'features/database-editor/stores/databaseEditorStore';
import { MissingDataPrompt } from './missing-data-prompt';
import { MissingMaterialsPrompt } from './missing-materials-prompt';
import { TableDataset } from './table-dataset';
import { useRef, useMemo } from 'react';

const MATERIALS_KEY = MATERIALS_DATA_KEY.join('-');

// Row key per dataset; everything else is keyed by `code`. Materials use `name` because that
// is what ENVELOPE_WALL/ROOF/FLOOR reference through material_name_1..3.
const INDEX_COLUMNS = {
  'ARCHETYPES-CONSTRUCTION-construction_types': 'const_type',
  [MATERIALS_KEY]: 'name',
};

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
  const INDEX_COLUMN = INDEX_COLUMNS[key] ?? 'code';

  const _data = useMemo(() => {
    const transformed = data ? transformData(INDEX_COLUMN, data) : data;
    return transformed;
  }, [INDEX_COLUMN, data]);

  if (data === undefined) return <div>No data selected.</div>;
  if (data === null)
    return key === MATERIALS_KEY ? (
      <MissingMaterialsPrompt />
    ) : (
      <MissingDataPrompt dataKey={dataKey} />
    );

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
      />
    </div>
  );
};

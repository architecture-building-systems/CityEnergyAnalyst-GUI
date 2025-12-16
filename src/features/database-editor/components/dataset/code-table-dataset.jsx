import { useDatabaseSchema } from 'features/database-editor/stores/databaseEditorStore';
import { MissingDataPrompt } from './missing-data-prompt';
import { TableDataset } from './table-dataset';
import { arraysEqual } from 'utils';
import { DuplicateRowButton } from 'features/database-editor/components/duplicate-row-button';
import { DeleteRowButton } from 'features/database-editor/components/delete-row-button';
import { useCallback, useRef, useState, useMemo } from 'react';
import { AddRowButton } from '../add-row-button';

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
  const [selectedCount, setSelectedCount] = useState(0);

  const key = dataKey.join('-');
  const INDEX_COLUMN = arraysEqual(dataKey, CONSTRUCTION_DATABASE)
    ? 'const_type'
    : 'code';

  const _data = useMemo(() => {
    const transformed = data ? transformData(INDEX_COLUMN, data) : data;
    return transformed;
  }, [INDEX_COLUMN, data]);

  const handleRowSelectionChanged = useCallback((data, rows) => {
    setSelectedCount(rows.length);
  }, []);

  if (data === undefined) return <div>No data selected.</div>;
  if (data === null) return <MissingDataPrompt dataKey={dataKey} />;

  return (
    <div className="cea-database-editor-database-dataset-code">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <DuplicateRowButton
            data={data}
            dataKey={dataKey}
            index={INDEX_COLUMN}
            schema={schema}
            tabulatorRef={tabulatorRef}
            selectedCount={selectedCount}
          />
          <DeleteRowButton
            dataKey={dataKey}
            index={INDEX_COLUMN}
            tabulatorRef={tabulatorRef}
            selectedCount={selectedCount}
          />
          <AddRowButton
            data={data}
            dataKey={dataKey}
            index={INDEX_COLUMN}
            schema={schema}
          />
        </div>
      </div>
      <TableDataset
        ref={tabulatorRef}
        key={key}
        dataKey={dataKey}
        data={_data}
        indexColumn={INDEX_COLUMN}
        schema={schema}
        enableRowSelection={true}
        onRowSelectionChanged={handleRowSelectionChanged}
      />
    </div>
  );
};

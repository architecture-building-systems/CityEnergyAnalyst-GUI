import { Button } from 'antd';
import { TableDataset } from './table-dataset';
import { useState } from 'react';

const INDEX_COLUMN = null;
const COMMON_COLUMNS = ['reference'];

export const LibraryDataset = ({ dataKey, data }) => {
  // Object keys are the file names, values are data as arrays of objects
  const [selectedLibrary, setSelectedLibrary] = useState(null);

  return (
    <div className="cea-database-editor-database-container">
      <div className="cea-database-editor-database-dataset-buttons">
        {Object.keys(data).map((library) => (
          <Button
            key={library}
            onClick={() => setSelectedLibrary(library)}
            type={selectedLibrary == library ? 'primary' : 'default'}
          >
            {library.toUpperCase()}
          </Button>
        ))}
      </div>

      {selectedLibrary != null && (
        <div className="cea-database-editor-database-dataset">
          <TableDataset
            dataKey={`${dataKey}-${selectedLibrary}`}
            name={selectedLibrary}
            data={data?.[selectedLibrary]}
            indexColumn={INDEX_COLUMN}
            commonColumns={COMMON_COLUMNS}
          />
        </div>
      )}
    </div>
  );
};

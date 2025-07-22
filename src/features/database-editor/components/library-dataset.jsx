import { Button } from 'antd';
import { TableDataset } from './table-dataset';
import { useState } from 'react';

const INDEX_COLUMN = null;
const COMMON_COLUMNS = ['reference'];

export const LibraryDataset = ({ data }) => {
  // Object keys are the file names, values are data as arrays of objects
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  // Select the relevant data array from the object; TableDataset expects an object
  const selectedData = selectedLibrary !== null && {
    [selectedLibrary]: data?.[selectedLibrary],
  };

  return (
    <div className="cea-database-editor-database-container">
      <div className="cea-database-editor-database-dataset-buttons">
        {Object.keys(data).map((library) => (
          <Button
            key={library}
            onClick={() => setSelectedLibrary(library)}
            type={selectedLibrary == library ? 'primary' : 'default'}
          >
            <div>
              <b>{library.toUpperCase()}</b>
            </div>
          </Button>
        ))}
      </div>

      {selectedLibrary != null && (
        <div className="cea-database-editor-database-dataset">
          <TableDataset
            data={selectedData}
            indexColumn={INDEX_COLUMN}
            commonColumns={COMMON_COLUMNS}
          />
        </div>
      )}
    </div>
  );
};

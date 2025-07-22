import { TableGroupDataset } from './table-dataset';

const INDEX_COLUMN = 'code';
const COMMON_COLUMNS = ['code', 'type', 'description', 'currency', 'unit'];

export const ConversionDataset = ({ data }) => {
  return (
    <TableGroupDataset
      data={data}
      indexColumn={INDEX_COLUMN}
      commonColumns={COMMON_COLUMNS}
    />
  );
};

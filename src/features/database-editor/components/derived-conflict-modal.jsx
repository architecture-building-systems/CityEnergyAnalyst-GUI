import { Modal, Table, Typography } from 'antd';

const { Paragraph } = Typography;

const COLUMNS = [
  { title: 'Table', dataIndex: 'table', key: 'table' },
  { title: 'Row', dataIndex: 'code', key: 'code' },
  { title: 'Column', dataIndex: 'column', key: 'column' },
  {
    title: 'Stored',
    dataIndex: 'stored',
    key: 'stored',
    render: (value) => Number(value).toPrecision(4),
  },
  {
    title: 'From layers',
    dataIndex: 'derived',
    key: 'derived',
    render: (value) => Number(value).toPrecision(4),
  },
];

/**
 * Confirms replacing stored U/GHG values that contradict their material layers.
 *
 * Only reached for disagreements the user did not cause -- editing a layer re-derives
 * silently, because the stored value there simply describes the previous composition.
 * Cancelling abandons the whole save: a partial write would leave the editor showing
 * values that were never stored.
 */
export const DerivedConflictModal = ({ conflicts, onConfirm, onCancel }) => (
  <Modal
    open={conflicts != null}
    title="Replace values that disagree with their material layers?"
    onOk={onConfirm}
    onCancel={onCancel}
    okText={`Replace ${conflicts?.length ?? 0} value(s) and save`}
    cancelText="Cancel — save nothing"
    width={720}
  >
    <Paragraph>
      These rows store U or embodied-carbon values that do not match what their
      material layers produce. Material layers are the source of truth, so
      saving replaces them.
    </Paragraph>
    <Paragraph type="secondary">
      To keep a stored value instead, cancel and remove the material layers from
      that row — a row defines its construction either by layers or by direct
      properties, not both.
    </Paragraph>
    <Table
      size="small"
      rowKey={(row) => `${row.table}-${row.code}-${row.column}`}
      dataSource={conflicts ?? []}
      columns={COLUMNS}
      pagination={(conflicts?.length ?? 0) > 10 && { pageSize: 10 }}
      scroll={{ y: 320 }}
    />
  </Modal>
);

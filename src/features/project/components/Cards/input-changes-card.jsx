import { SearchOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import { ChangesSummary } from 'features/input-editor/components/changes-summary';
import { InputChangesButtons } from 'features/input-editor/components/input-changes-buttons';
import {
  useChanges,
  useChangesExist,
} from 'features/input-editor/stores/inputEditorStore';
import { useState } from 'react';

export const InputChangesCard = () => {
  const changes = useChanges();
  const changesExist = useChangesExist();

  const [visible, setVisible] = useState(false);

  const onOpen = () => setVisible(true);
  const onClose = () => setVisible(false);

  if (!changesExist) return null;

  return (
    <>
      <div
        className="cea-overlay-card"
        style={{
          background: '#fff',
          padding: 12,
          borderRadius: 12,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

          boxSizing: 'border-box',

          display: 'flex',
          flexDirection: 'column',
          gap: 8,

          fontSize: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <b>Changes detected</b>
          <Button
            size="small"
            icon={<SearchOutlined />}
            title="View changes"
            onClick={onOpen}
          />
        </div>
        <InputChangesButtons changes={changes} />
      </div>
      <Modal title="Changes" open={visible} onCancel={onClose} footer={null}>
        <ChangesSummary changes={changes} />
      </Modal>
    </>
  );
};

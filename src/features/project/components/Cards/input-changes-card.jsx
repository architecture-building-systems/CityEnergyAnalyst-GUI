import { SearchOutlined } from '@ant-design/icons';
import { Button, Modal, Tooltip } from 'antd';
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
      {/* One row: the label on the left, every action clustered on the right. */}
      <div
        className="cea-overlay-card"
        style={{
          backgroundColor: 'rgb(255, 255, 255)',
          padding: 12,

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,

          fontSize: 12,
        }}
      >
        <b>Changes detected</b>
        {/* `gap: 8` matches the spacing `InputChangesButtons` uses between its own two
            buttons, so the three read as one evenly-spaced group. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="cea-card-icon-button-container">
            <Tooltip title="View changes" placement="bottom">
              <Button
                type="text"
                icon={<SearchOutlined />}
                onClick={onOpen}
                aria-label="View changes"
              />
            </Tooltip>
          </div>
          <InputChangesButtons changes={changes} />
        </div>
      </div>
      <Modal title="Changes" open={visible} onCancel={onClose} footer={null}>
        <ChangesSummary changes={changes} />
      </Modal>
    </>
  );
};

import { useState, useEffect } from 'react';
import { Button, Modal, Menu } from 'antd';
import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';

const DatabaseTopMenu = () => {
  const data = useDatabaseEditorStore((state) => state.data);
  const validation = useDatabaseEditorStore((state) => state.validation);
  const setActiveDatabase = useDatabaseEditorStore(
    (state) => state.setActiveDatabase,
  );

  const dataKeys = Object.keys(data ?? {});
  const defaultKey = data.length
    ? `${dataKeys[0]}:${Object.keys(data[dataKeys[0]])[0]}`
    : null;

  const [selectedKey, setSelected] = useState(defaultKey);
  const [visible, setVisible] = useState(false);

  const handleOk = () => {
    setVisible(false);
  };

  useEffect(() => {
    if (selectedKey) setActiveDatabase(...selectedKey.split(':'));
  }, [selectedKey]);

  if (selectedKey === null) return null;
  return (
    <div className="cea-database-editor-database-menu">
      <Menu
        mode="horizontal"
        onClick={({ key }) => {
          // Show modal if changing database and there are validation errors
          if (selectedKey !== key && !!Object.keys(validation).length)
            setVisible(true);
          else setSelected(key);
        }}
        selectedKeys={[selectedKey]}
        items={Object.keys(data).map((category) => ({
          key: category,
          label: category.toUpperCase(),
          children: Object.keys(data[category]).map((name) => ({
            key: `${category}:${name}`,
            label: name.replace('_', '-'),
          })),
        }))}
      />
      <Modal
        centered
        closable={false}
        open={visible}
        footer={[
          <Button key="back" onClick={handleOk}>
            Go Back
          </Button>,
        ]}
      >
        There are still errors in this database.
        <br />
        You would need to fix the errors before navigating to another database
      </Modal>
    </div>
  );
};

export default DatabaseTopMenu;

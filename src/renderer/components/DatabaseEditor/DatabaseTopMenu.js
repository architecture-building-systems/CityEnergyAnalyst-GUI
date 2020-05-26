import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Button, Modal, Menu } from 'antd';
import './DatabaseEditor.css';

const DatabaseTopMenu = ({ databaseCategories, onChange = () => {} }) => {
  const validation = useSelector(state => state.databaseEditor.validation);
  const [selectedKey, setSelected] = useState(
    `${Object.keys(databaseCategories)[0]}:${
      databaseCategories[Object.keys(databaseCategories)[0]][0]
    }`
  );
  const [visible, setVisible] = useState(false);

  const handleOk = () => {
    setVisible(false);
  };

  useEffect(() => {
    onChange(...selectedKey.split(':'));
  }, [selectedKey]);

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
      >
        {Object.keys(databaseCategories).map(category => (
          <Menu.SubMenu key={category} title={category.toUpperCase()}>
            {databaseCategories[category].map(name => (
              <Menu.Item key={`${category}:${name}`}>
                {name.replace('_', '-')}
              </Menu.Item>
            ))}
          </Menu.SubMenu>
        ))}
      </Menu>
      <Modal
        centered
        closable={false}
        visible={visible}
        footer={[
          <Button key="back" onClick={handleOk}>
            Go Back
          </Button>
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

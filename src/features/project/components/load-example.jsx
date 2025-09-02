import { ProductOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import NewProjectModal from './modals/NewProjectModal';

export const LoadExampleButton = () => {
  const [visible, setVisible] = useState(false);

  const handleSuccess = async (project) => {
    console.log('Loaded example project:', project);
    setVisible(false);
  };

  return (
    <>
      <Button
        icon={<ProductOutlined />}
        className="open-new-project-btn"
        onClick={() => setVisible(true)}
        style={{ flex: 1 }}
      >
        Load Example Project
      </Button>
      <NewProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={handleSuccess}
        exampleProject={true}
      />
    </>
  );
};

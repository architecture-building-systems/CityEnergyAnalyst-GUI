import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { push } from 'connected-react-router';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import NewProjectModal from '../../Project/NewProjectModal';

import routes from '../../../constants/routes.json';

const NewProjectModalButton = () => {
  const [visible, setVisible] = useState(false);
  const dispatch = useDispatch();

  const goToProjectPage = () => {
    dispatch(push(routes.PROJECT));
  };

  return (
    <>
      <Button
        type="primary"
        style={{ width: '100%' }}
        onClick={() => setVisible(true)}
      >
        <PlusOutlined />
        New Project
      </Button>
      <NewProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={goToProjectPage}
      />
    </>
  );
};

export default NewProjectModalButton;

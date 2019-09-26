import React from 'react';
import { Modal } from 'antd';

const CreatingScenarioModal = ({ visible, setVisible }) => {
  const hideModal = () => {
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      width={800}
      footer={false}
      onCancel={hideModal}
      closable={false}
      maskClosable={false}
    >
      Creating Scenario
    </Modal>
  );
};

export default CreatingScenarioModal;

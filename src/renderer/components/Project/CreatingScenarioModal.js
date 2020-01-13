import React from 'react';
import { Modal, Button, Icon } from 'antd';
import { AsyncError } from '../../utils';

const CreatingScenarioModal = ({
  visible,
  setVisible,
  error,
  createScenario
}) => {
  const hideModal = () => {
    setVisible(false);
  };

  const retry = () => {
    createScenario();
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
      {error ? (
        <div>
          <AsyncError error={error} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={hideModal}>Cancel</Button>
            <Button onClick={retry}>Retry</Button>
          </div>
        </div>
      ) : (
        <div>
          <Icon type="loading" style={{ color: 'blue', margin: 5 }} />
          <span>Creating Scenario</span>
        </div>
      )}
    </Modal>
  );
};

export default CreatingScenarioModal;

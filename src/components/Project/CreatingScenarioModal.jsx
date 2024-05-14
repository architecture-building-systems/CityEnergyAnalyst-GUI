import { LoadingOutlined } from '@ant-design/icons';
import { Modal, Button } from 'antd';
import { AsyncError } from '../../utils/AsyncError';

const CreatingScenarioModal = ({
  visible,
  setVisible,
  error,
  createScenario,
}) => {
  const hideModal = () => {
    setVisible(false);
  };

  const retry = () => {
    createScenario();
  };

  return (
    <Modal
      open={visible}
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
          <LoadingOutlined style={{ color: 'blue', margin: 5 }} />
          <span>Creating Scenario</span>
        </div>
      )}
    </Modal>
  );
};

export default CreatingScenarioModal;

import { ExclamationCircleFilled } from '@ant-design/icons';
import { Modal } from 'antd';

const ErrorModal = ({ open, title, message, error, onClose }) => {
  const errorMessage =
    error?.response?.data?.detail ||
    error?.message ||
    error?.toString?.() ||
    'Unknown error';

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', gap: 8 }}>
          <ExclamationCircleFilled style={{ color: 'red' }} />
          {title}
        </div>
      }
      onOk={onClose}
      onCancel={onClose}
      cancelButtonProps={{ style: { display: 'none' } }}
    >
      <div>{message}</div>
      <div
        style={{
          background: '#efefef',
          borderRadius: 8,
          overflowX: 'auto',
        }}
      >
        <pre style={{ padding: 16 }}>{errorMessage}</pre>
      </div>
    </Modal>
  );
};

export default ErrorModal;

import { Modal } from 'antd';
import {
  useSetShowLoginModal,
  useShowLoginModal,
} from 'features/auth/stores/login-modal';
import LoginButton from './LoginButton';

const LoginModal = () => {
  const showModal = useShowLoginModal();
  const setShowModal = useSetShowLoginModal();

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <Modal open={showModal} onCancel={handleClose} footer={null}>
      <div
        style={{
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div>You must be logged in to use this feature.</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <LoginButton />
        </div>
      </div>
    </Modal>
  );
};

export default LoginModal;

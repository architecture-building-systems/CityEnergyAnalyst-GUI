import { Button } from 'antd';
import { apiClient } from '../../api/axios';

const logout = async () => {
  try {
    const resp = await apiClient.delete('/api/user/logout');
    console.log('Logout:', resp.data);
    return true;
  } catch (error) {
    console.log('Error logging out:', error);
  }
};

const LogoutButton = () => {
  const handleLogout = async () => {
    const success = await logout();
    if (success) window.location.reload();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 12,
      }}
    >
      <Button size="small" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
};

export default LogoutButton;

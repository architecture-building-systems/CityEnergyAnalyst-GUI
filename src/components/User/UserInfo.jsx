import { useEffect, useState } from 'react';
import { apiClient, COOKIE_NAME } from '../../api/axios';
import { Avatar, Button } from 'antd';

const useUserLoggedIn = () => {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const parsedCookies = parseCookies();
    if (parsedCookies[COOKIE_NAME]) setLoggedIn(true);
  }, []);

  return loggedIn;
};

const parseCookies = () => {
  const cookieObj = {};
  const cookieString = document.cookie;

  if (cookieString === '') return {};

  const cookieArray = cookieString.split(';');

  cookieArray.forEach((cookie) => {
    const [key, value] = cookie.trim().split('=');
    cookieObj[decodeURIComponent(key)] = decodeURIComponent(value);
  });

  return cookieObj;
};

const useUserInfo = () => {
  const [userInfo, setUserInfo] = useState();

  useEffect(() => {
    const getUserInfoAsync = async () => {
      try {
        const resp = await apiClient.get('/api/user');
        console.log('User info:', resp.data);
        setUserInfo(resp.data);
      } catch (error) {
        console.log('Error getting user info:', error);
      }
    };

    getUserInfoAsync();
  }, []);

  return userInfo;
};

const logout = async () => {
  try {
    const resp = await apiClient.delete('/api/user/logout');
    console.log('Logout:', resp.data);
    return true;
  } catch (error) {
    console.log('Error logging out:', error);
  }
};

const UserInfoCard = () => {
  const userInfo = useUserInfo();

  const handleLogout = async () => {
    const success = await logout();
    if (success) window.location.reload();
  };

  if (!userInfo) return null;

  return (
    <div
      style={{
        padding: 8,
        background: '#fff',
        borderRadius: 9,
        boxShadow: '0 0 10px rgba(0,0,0,.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
          }}
        >
          <Avatar
            style={{
              verticalAlign: 'middle',
            }}
            size="large"
            src={userInfo?.profile_image_url}
          >
            {userInfo?.display_name?.[0]}
          </Avatar>
          <b>{userInfo?.display_name}</b>
        </div>
        <Button size="small" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
};

const LoginButton = () => {
  const handleLogin = async () => {
    const currentUrl = encodeURIComponent(`${window.location.origin}`);
    const callbackUrl = encodeURIComponent(`/callback?url=${currentUrl}`);
    window.location.href = `${import.meta.env.VITE_AUTH_URL}/login?after_auth_return_to=${callbackUrl}`;
  };

  return <Button onClick={handleLogin}>Login</Button>;
};

const UserInfo = () => {
  const loggedIn = useUserLoggedIn();

  if (!loggedIn) {
    return (
      <div>
        <LoginButton />
      </div>
    );
  }

  return <UserInfoCard />;
};

export default UserInfo;

import { useEffect, useState } from 'react';
import { COOKIE_NAME } from '../../api/axios';
import { Avatar } from 'antd';
import { useUserInfo } from './store';
import LoginModal from '../Login/LoginModal';
import LoginButton from '../Login/LoginButton';
import LogoutButton from '../Login/LogoutButton';

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

const UserInfoCard = () => {
  const userInfo = useUserInfo();

  if (!userInfo) return null;

  console.log('userInfo:', userInfo);
  const displayName = userInfo?.display_name || userInfo?.primary_email;

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
            {displayName?.[0]}
          </Avatar>
          <b>{displayName}</b>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
};

const UserInfo = () => {
  const loggedIn = useUserLoggedIn();

  if (!loggedIn) {
    return (
      <div>
        <LoginButton />
        <LoginModal />
      </div>
    );
  }

  return <UserInfoCard />;
};

export default UserInfo;

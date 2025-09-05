import { useEffect, useState } from 'react';
import { COOKIE_NAME } from 'lib/api/axios';
import { Avatar, Badge } from 'antd';
import { useUserInfo } from 'stores/userStore';
import LoginModal from 'features/auth/components/Login/LoginModal';
import LoginButton from 'features/auth/components/Login/LoginButton';
import LogoutButton from 'features/auth/components/Login/LogoutButton';

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

  const displayName = userInfo?.display_name || userInfo?.primary_email;
  const proUser = userInfo?.pro_user;

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
            minWidth: 0,
          }}
        >
          <div>
            <Avatar
              style={{
                verticalAlign: 'middle',
              }}
              size="large"
              src={userInfo?.profile_image_url}
            >
              {displayName?.[0]}
            </Avatar>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {displayName}
            </div>
            {proUser ? (
              <Badge count="PRO" color="purple" style={{ fontSize: 10 }} />
            ) : null}
          </div>
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

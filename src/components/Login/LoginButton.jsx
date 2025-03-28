import { Button } from 'antd';
import { useCallback } from 'react';

const LoginButton = () => {
  const handleLogin = useCallback(async () => {
    const currentUrl = encodeURIComponent(`${window.location.origin}`);
    const callbackUrl = encodeURIComponent(`/callback?url=${currentUrl}`);
    const authUrl = `${import.meta.env.VITE_AUTH_URL}/login?after_auth_return_to=${callbackUrl}`;

    window.location.href = authUrl;
  }, []);

  return <Button onClick={handleLogin}>Login</Button>;
};

export default LoginButton;

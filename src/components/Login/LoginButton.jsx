import { Button } from 'antd';
import { useCallback, useState } from 'react';

const LoginButton = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    const currentUrl = encodeURIComponent(`${window.location.origin}`);
    const callbackUrl = encodeURIComponent(`/callback?url=${currentUrl}`);
    const authUrl = `${import.meta.env.VITE_AUTH_URL}/login?after_auth_return_to=${callbackUrl}`;

    window.location.href = authUrl;
  }, []);

  return (
    <Button loading={loading} onClick={handleLogin}>
      Login
    </Button>
  );
};

export default LoginButton;

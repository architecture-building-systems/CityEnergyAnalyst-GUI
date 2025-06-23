import axios from 'axios';

export const COOKIE_NAME = import.meta.env.VITE_AUTH_COOKIE_NAME;

export const getAccessTokenStringFromCookies = () => {
  const cookies = document.cookie.split(';');

  const tokenCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${COOKIE_NAME}=`),
  );

  if (tokenCookie) {
    return tokenCookie.trim().substring(`${COOKIE_NAME}=`.length);
  }

  return null;
};

function decodeJWT(token) {
  // A JWT consists of three parts: header.payload.signature
  // We only need to decode the header and payload parts

  try {
    // Split the token into its three parts
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // Decode the header and payload
    const header = JSON.parse(
      atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')),
    );
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    );

    // Return both the header and payload
    return {
      header,
      payload,
      signature: parts[2], // We're returning this but not decoding it
    };
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

function isTokenExpiredOrCloseToExpiry(token) {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    const buffer = 30; // Refresh if token expires in 30 seconds

    return payload.exp < now + buffer;
  } catch (e) {
    console.error(e);
    return true; // If there's an error parsing, assume expired
  }
}

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_CEA_URL}`,
});

apiClient.interceptors.request.use(
  async (config) => {
    const accessTokenString = getAccessTokenStringFromCookies();
    if (accessTokenString) {
      const decodedString = JSON.parse(decodeURIComponent(accessTokenString));
      const refreshToken = decodedString[0];
      const accessToken = decodedString[1];

      // Ignore request if no access token is present
      if (!accessToken) return config;

      // Try to refresh token if near expiry
      if (isTokenExpiredOrCloseToExpiry(accessToken)) {
        // FIXME: Queue request to refresh token
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_CEA_URL}/api/user/session/refresh`,
            {},
            { withCredentials: true },
          );

          const newAccessToken = response.data?.access_token;
          if (!newAccessToken) {
            throw new Error(
              'Failed to refresh access token: No access token returned',
            );
          }

          document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
            JSON.stringify([refreshToken, newAccessToken]),
          )}`;
          config.withCredentials = true;
        } catch (e) {
          // Assume token used is invalid or expired if status is 401 and remove cookie
          if (e.response?.status == 401) {
            document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
          }
          console.error(e);
        }
      } else {
        // Attach access token to request if access token is valid
        config.withCredentials = true;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

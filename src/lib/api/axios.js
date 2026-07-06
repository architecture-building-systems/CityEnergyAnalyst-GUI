import axios from 'axios';

import useDemoStore from 'stores/demoStore';
import {
  PROJECT_HEADER,
  SCENARIO_NAME_HEADER,
  CHILD_SCENARIO_HEADER,
} from 'lib/api/scenarioContextHeaders';

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

// TODO: Find a better way, e.g. using env var or store in localStorage/cookie
const getCookieDomain = () => {
  const hostname = window.location.hostname;
  // Extract the root domain (e.g., "a.b.c" -> ".b.c")
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return `.${parts.slice(-2).join('.')}`;
  }
  return hostname;
};

// Helper function to generate secure cookie attributes
const getCookieSecurityAttributes = () => {
  const domain = getCookieDomain();
  const domainPart = domain && domain.includes('.') ? `; domain=${domain}` : '';
  const isSecure = window.location.protocol === 'https:';
  const securePart = isSecure ? '; Secure' : '';
  return `${domainPart}; path=/; SameSite=Lax${securePart}`;
};

// Helper function to clear auth cookie
const clearAuthCookie = () => {
  const securityAttributes = getCookieSecurityAttributes();
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${securityAttributes}`;
};

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

export const authClient = axios.create({
  baseURL: `${import.meta.env.VITE_AUTH_URL}`,
});

// For public, unauthenticated backend routes (e.g. /server/version) that
// shouldn't go through the token-refresh interceptor at all.
export const publicClient = axios.create({
  baseURL: `${import.meta.env.VITE_CEA_URL}`,
});

// For anonymous, read-only demo scenario viewing (no valid session - see
// UserCheckGate). Requests made with this client are rewritten below to hit
// the public `/api/demo/scenarios/{demoId}/...` sub-app instead of the normal
// `/api/...` routes, so existing hooks/queries can be pointed at demo data by
// swapping their client, not their URLs.
export const demoClient = axios.create({
  baseURL: `${import.meta.env.VITE_CEA_URL}`,
});

demoClient.interceptors.request.use((config) => {
  const { demoId } = useDemoStore.getState();

  if (demoId && config.url?.startsWith('/api/')) {
    config.url = `/api/demo/scenarios/${encodeURIComponent(demoId)}${config.url.slice('/api'.length)}`;
  }

  // The demo sub-app resolves scenario context from the URL path
  // ({demoId} above), not from X-CEA-* headers - strip them so a stray
  // header can't be misread as an attempt to reach outside the allowlist.
  if (config.headers) {
    delete config.headers[PROJECT_HEADER];
    delete config.headers[SCENARIO_NAME_HEADER];
    delete config.headers[CHILD_SCENARIO_HEADER];
  }

  return config;
});

// Returns the axios client that should be used for scenario-scoped reads
// (inputs, map layers, canvas). Callers that already build their requests
// against `apiClient`'s normal `/api/...` URLs can swap in this client to
// transparently support demo mode - no other changes needed.
export const getScenarioClient = () =>
  useDemoStore.getState().demoMode ? demoClient : apiClient;

// Helper function for request interceptor logic
let refreshPromise = null; // single-flight
const addAuthInterceptor = (client, refreshUrl) => {
  client.interceptors.request.use(
    async (config) => {
      const accessTokenString = getAccessTokenStringFromCookies();
      if (accessTokenString) {
        let decodedString;
        try {
          decodedString = JSON.parse(decodeURIComponent(accessTokenString));
        } catch (err) {
          console.warn(
            'Invalid auth cookie. Clearing and continuing unauthenticated.',
            err,
          );
          clearAuthCookie();
          return config;
        }
        const refreshToken = decodedString[0];
        const accessToken = decodedString[1];

        // Ignore request if no access token is present
        if (!accessToken) return config;

        // Try to refresh token if near expiry
        if (isTokenExpiredOrCloseToExpiry(accessToken)) {
          try {
            if (!refreshPromise) {
              refreshPromise = axios.post(
                refreshUrl,
                {},
                { withCredentials: true },
              );
            }
            const response = await refreshPromise.finally(() => {
              refreshPromise = null;
            });

            const newAccessToken = response.data?.access_token;
            if (!newAccessToken) {
              throw new Error(
                'Failed to refresh access token: No access token returned',
              );
            }

            const securityAttributes = getCookieSecurityAttributes();
            document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
              JSON.stringify([refreshToken, newAccessToken]),
            )}${securityAttributes}`;
            config.withCredentials = true;
          } catch (e) {
            // Assume token used is invalid or expired if status is 401 and remove cookie
            if (e.response?.status === 401) {
              clearAuthCookie();
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
};

// Apply interceptors to both clients
addAuthInterceptor(
  apiClient,
  `${import.meta.env.VITE_CEA_URL}/api/user/session/refresh`,
);
addAuthInterceptor(
  authClient,
  `${import.meta.env.VITE_CEA_URL}/api/user/session/refresh`,
);

// JSON requests can't carry a browser File — JSON.stringify(File) yields
// {"uid":"rc-upload-..."} because only antd's added `uid` is enumerable.
// Strip File instances down to file.name on the way out, but skip multipart
// payloads so postForm and explicit FormData uploads still send file bytes.
const stripFiles = (data) => {
  if (data == null) return data;
  if (data instanceof File) return data.name;
  if (Array.isArray(data)) return data.map(stripFiles);
  if (typeof data === 'object' && data.constructor === Object) {
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, stripFiles(v)]),
    );
  }
  return data;
};

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) return config;
  const ct =
    config.headers?.['Content-Type'] ?? config.headers?.['content-type'] ?? '';
  if (String(ct).includes('multipart/form-data')) return config;
  if (config.data != null) config.data = stripFiles(config.data);
  return config;
});

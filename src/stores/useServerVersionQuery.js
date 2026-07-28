import { useQuery } from '@tanstack/react-query';
import { publicClient } from 'lib/api/axios';
import { isElectron } from 'utils/electron';

export const SERVER_VERSION_QUERY_KEY = ['server-version'];

const fetchServerVersion = async () => {
  // In Electron, prefer the native app version. Guard against `window.api`
  // being absent even when `isElectron()` is true (e.g. an Electron-based
  // shell rendering this as a plain webpage with no preload script).
  if (isElectron() && window.api?.getAppVersion) {
    const electronVersion = await window.api.getAppVersion();
    if (electronVersion) return `v${electronVersion}`;
  }

  const { data } = await publicClient.get('/server/version');
  if (data?.version) return `v${data.version}`;

  throw new Error('No version found');
};

// A refetch-on-focus/reconnect would otherwise fire on every window
// refocus regardless of whether the last attempt succeeded or is still
// mid-retry, so it's disabled here for every caller of this key.
export const useServerVersionQuery = (options) => {
  return useQuery({
    queryKey: SERVER_VERSION_QUERY_KEY,
    queryFn: fetchServerVersion,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...options,
  });
};

// Stops retrying after `maxBlockingAttempts` failures instead of polling
// forever — once exhausted, the query settles into `isError` and stays put
// until `refetch()` is called for another bounded attempt.
export const useWaitForServer = (maxBlockingAttempts = 3) => {
  const { isLoading, isPending, isError, isSuccess, refetch } =
    useServerVersionQuery({
      retry: maxBlockingAttempts,
      retryDelay: 1500,
    });

  return {
    isSuccess,
    refetch,
    isBlocking: isLoading || isPending,
    isUnreachable: isError,
  };
};

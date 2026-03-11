import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';

export const SERVER_VERSION_QUERY_KEY = ['server-version'];

const fetchServerVersion = async () => {
  // In Electron, prefer the native app version
  const electronVersion = await window?.api?.getAppVersion();
  if (electronVersion) return `v${electronVersion}`;

  const { data } = await apiClient.get('/server/version');
  if (data?.version) return `v${data.version}`;

  throw new Error('No version found');
};

export const useServerVersionQuery = () => {
  return useQuery({
    queryKey: SERVER_VERSION_QUERY_KEY,
    queryFn: fetchServerVersion,
    staleTime: Infinity,
  });
};

export const useWaitForServer = () => {
  return useQuery({
    queryKey: SERVER_VERSION_QUERY_KEY,
    queryFn: fetchServerVersion,
    staleTime: Infinity,
    retry: true,
    retryDelay: 1500,
  });
};

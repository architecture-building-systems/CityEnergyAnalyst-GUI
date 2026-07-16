import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { isElectron } from 'utils/electron';

export const USER_QUERY_KEY = ['user'];

const fetchUser = async () => {
  try {
    const resp = await apiClient.get('/api/user');
    return resp.data;
  } catch (err) {
    if (err.response?.status === 401) return null; // no session or unauthorized
    throw err;
  }
};

export const useUserQuery = () => {
  return useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: fetchUser,
    staleTime: Infinity,
  });
};

export const useInvalidateUser = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
};

export const useUserInfo = () => {
  const { data } = useUserQuery();
  return data ?? null;
};

export const useIsValidUser = () => {
  const userInfo = useUserInfo();
  return isElectron() || (userInfo && userInfo?.id != 'localuser');
};

// True when talking to a stateless (non-local/cloud) backend, where config
// save() is a no-op server-side - see CEAStatelessConfig. Local server and
// Electron builds resolve to user id `localuser` (disk-backed config), so
// they're excluded here. Demo mode has no user, so this is also false there.
export const useIsNonLocalMode = () => {
  const userInfo = useUserInfo();
  return !isElectron() && !!userInfo && userInfo?.id !== 'localuser';
};

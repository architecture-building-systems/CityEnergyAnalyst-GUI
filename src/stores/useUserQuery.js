import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { isElectron } from 'utils/electron';

export const USER_QUERY_KEY = ['user'];

const fetchUser = async () => {
  const resp = await apiClient.get('/api/user');
  return resp.data;
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

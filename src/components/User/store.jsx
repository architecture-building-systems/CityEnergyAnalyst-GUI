import { useCallback } from 'react';
import { create } from 'zustand';
import { apiClient } from '../../api/axios';

const useUserInfoStore = create((set) => ({
  userInfo: null,
  setUserInfo: (userInfo) => set({ userInfo }),
}));

export const useUserInfo = () => useUserInfoStore((state) => state.userInfo);

export const useUpdateUserInfo = () =>
  useUserInfoStore((state) => state.setUserInfo);

const getUserInfoAsync = async () => {
  try {
    const resp = await apiClient.get('/api/user');
    return resp.data;
  } catch (error) {
    console.log('Error getting user info:', error);
    return null;
  }
};

export const useInitUserInfo = () => {
  const updateUserInfo = useUpdateUserInfo();

  const initUserInfo = useCallback(async () => {
    const userInfo = await getUserInfoAsync();
    updateUserInfo(userInfo);
  }, [updateUserInfo]);

  return initUserInfo;
};

export const useResetUserInfo = () => {
  const updateUserInfo = useUpdateUserInfo();

  const resetUserInfo = useCallback(() => {
    updateUserInfo(null);
  }, [updateUserInfo]);

  return resetUserInfo;
};

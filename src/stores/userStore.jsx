import { create } from 'zustand';
import { apiClient } from 'lib/api/axios';
import { isElectron } from 'utils/electron';

const useUserInfoStore = create((set) => ({
  userInfo: null,
  setUserInfo: (userInfo) => set({ userInfo }),

  initUserInfo: async () => {
    try {
      const resp = await apiClient.get('/api/user');
      set({ userInfo: resp.data });
    } catch (error) {
      console.log('Error getting user info:', error);
    }
  },
  resetUserInfo: () => set({ userInfo: null }),
}));

export const useUserInfo = () => useUserInfoStore((state) => state.userInfo);

export const useUpdateUserInfo = () =>
  useUserInfoStore((state) => state.setUserInfo);

export const useInitUserInfo = () =>
  useUserInfoStore((state) => state.initUserInfo);

export const useResetUserInfo = () =>
  useUserInfoStore((state) => state.resetUserInfo);

export const useIsValidUser = () =>
  useUserInfoStore(
    (state) =>
      isElectron() || (state.userInfo && state.userInfo?.id != 'localuser'),
  );

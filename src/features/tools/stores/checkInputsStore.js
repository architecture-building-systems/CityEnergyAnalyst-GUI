import { create } from 'zustand';
import { apiClient } from 'lib/api/axios';

const useCheckInputsStore = create((set) => ({
  checkingInputs: false,
  inputError: undefined,

  checkInputs: async (tool, parameters) => {
    if (!tool) {
      console.warn('Tool not specified for checking missing inputs.');
      return;
    }
    if (parameters === undefined) {
      console.warn('Parameters not provided for checking missing inputs.');
      return;
    }
    set({ checkingInputs: true, inputError: undefined });
    try {
      const response = await apiClient.post(
        `/api/tools/${tool}/check`,
        parameters,
      );
      set({ inputError: null });
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.statusText ||
        err.message ||
        'Unexpected error';
      set({ inputError: message });
    } finally {
      set({ checkingInputs: false });
    }
  },

  resetInputs: () => set({ checkingInputs: false, inputError: undefined }),
}));

export const useCheckInputs = () => {
  const checkInputs = useCheckInputsStore((s) => s.checkInputs);
  const resetInputs = useCheckInputsStore((s) => s.resetInputs);
  const checking = useCheckInputsStore((s) => s.checkingInputs);
  const error = useCheckInputsStore((s) => s.inputError);

  return { checkInputs, resetInputs, checking, error };
};

export default useCheckInputsStore;

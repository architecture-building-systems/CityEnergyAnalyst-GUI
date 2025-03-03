import { create } from 'zustand';

export const useJobStore = create((set) => ({
  selectedJob: null,
  setSeletedJob: (selectedJob) => set({ selectedJob }),
}));

export const useSelectedJob = () => [
  useJobStore((state) => state.selectedJob),
  (selectedJob) => {
    useJobStore.setState({ selectedJob });
  },
];

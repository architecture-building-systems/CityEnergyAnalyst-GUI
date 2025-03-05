import { create } from 'zustand';

export const useJobStore = create((set) => ({
  selectedJob: null,
  showJobInfo: false,
  setSeletedJob: (selectedJob) => set({ selectedJob }),
  setShowJobInfo: (showJobInfo) => set({ showJobInfo }),
}));

export const useSelectedJob = () => [
  useJobStore((state) => state.selectedJob),
  (selectedJob) => {
    useJobStore.setState({ selectedJob });
  },
];

export const useShowJobInfo = () => [
  useJobStore((state) => state.showJobInfo),
  (showJobInfo) => {
    useJobStore.setState({ showJobInfo });
  },
];

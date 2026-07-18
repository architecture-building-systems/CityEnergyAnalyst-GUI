import { useEffect } from 'react';
import { useProjectStore } from 'features/project/stores/projectStore';
import useDownloadStore from '../stores/downloadStore';

// Refresh the download list when the active project changes - the
// list endpoint is scoped to the current X-CEA-Project header.
export const useFetchDownloads = () => {
  const project = useProjectStore((state) => state.project);
  const fetchDownloads = useDownloadStore((state) => state.fetchDownloads);

  useEffect(() => {
    if (!project) return;

    fetchDownloads().catch((error) => {
      console.error('Failed to fetch downloads:', error);
    });
  }, [project, fetchDownloads]);
};

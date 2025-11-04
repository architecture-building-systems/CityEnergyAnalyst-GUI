import { create } from 'zustand';
import { apiClient } from 'lib/api/axios';
import socket, { waitForConnection } from 'lib/socket';

const useDownloadStore = create((set, get) => ({
  // Downloads map: downloadId -> download object
  downloads: {},

  // Add or update a download
  upsertDownload: (download) =>
    set((state) => ({
      downloads: {
        ...state.downloads,
        [download.id]: download,
      },
    })),

  // Remove a download
  removeDownload: (downloadId) =>
    set((state) => {
      const newDownloads = { ...state.downloads };
      delete newDownloads[downloadId];
      return { downloads: newDownloads };
    }),

  // Get downloads as array, sorted by creation date (newest first)
  getDownloadsArray: () => {
    const { downloads } = get();
    return Object.values(downloads).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
  },

  // Prepare a download (start the process)
  prepareDownload: async (project, scenarios, inputFiles, outputFiles) => {
    try {
      const response = await apiClient.post('/api/downloads/prepare', {
        project,
        scenarios,
        input_files: inputFiles,
        output_files: outputFiles,
      });

      const download = response.data;
      get().upsertDownload(download);
      return download;
    } catch (error) {
      console.error('Failed to prepare download:', error);
      throw error;
    }
  },

  // Fetch all downloads for current project/user
  fetchDownloads: async () => {
    try {
      const response = await apiClient.get('/api/downloads');
      const downloads = response.data;

      // Convert array to map
      const downloadsMap = {};
      downloads.forEach((download) => {
        downloadsMap[download.id] = download;
      });

      set({ downloads: downloadsMap });
      return downloads;
    } catch (error) {
      console.error('Failed to fetch downloads:', error);
      throw error;
    }
  },

  // Download a file
  downloadFile: async (downloadId) => {
    try {
      // First check download status to ensure it's ready and handle errors
      const statusResponse = await apiClient.get(
        `/api/downloads/${downloadId}/status`,
      );
      const downloadStatus = statusResponse.data;

      // Validate download is ready
      if (downloadStatus.state !== 'READY') {
        throw new Error(
          downloadStatus.error_message ||
            `Download is not ready (state: ${downloadStatus.state})`,
        );
      }

      // Get pre-signed download URL (expires in 5 minutes by default)
      const urlResponse = await apiClient.get(
        `/api/downloads/${downloadId}/url`,
      );
      const { url } = urlResponse.data;

      // Trigger download using pre-signed URL
      // Check if URL is already absolute (e.g., S3 presigned URL)
      const isAbsoluteUrl =
        url.startsWith('http://') || url.startsWith('https://');
      const downloadUrl = isAbsoluteUrl
        ? url
        : `${import.meta.env.VITE_CEA_URL}${url.startsWith('/') ? url : `/${url}`}`;

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);

      return true;
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  },

  // Delete a download
  deleteDownload: async (downloadId) => {
    try {
      await apiClient.delete(`/api/downloads/${downloadId}`);
      get().removeDownload(downloadId);
      return true;
    } catch (error) {
      console.error('Failed to delete download:', error);
      throw error;
    }
  },

  // Cleanup socket listeners (for unmount)
  cleanupSocketListeners: () => {
    socket.off('download-created');
    socket.off('download-progress');
    socket.off('download-ready');
    socket.off('download-started');
    socket.off('download-error');
    socket.off('download-downloaded');
  },

  // Initialize socket listeners
  initializeSocketListeners: () => {
    waitForConnection(() => {
      // Remove any existing listeners first to prevent duplicates on reconnect
      get().cleanupSocketListeners();

      // Download created
      socket.on('download-created', (download) => {
        if (import.meta.env.DEV) {
          console.log('download-created:', download);
        }
        get().upsertDownload(download);
      });

      // Download progress
      socket.on('download-progress', (data) => {
        if (import.meta.env.DEV) {
          console.log('download-progress:', data);
        }
        const existingDownload = get().downloads[data.download_id];
        if (existingDownload) {
          get().upsertDownload({
            ...existingDownload,
            state: data.state,
            progress_message: data.progress_message,
            progress_percent: data.progress_percent,
          });
        }
      });

      // Download ready
      socket.on('download-ready', (data) => {
        if (import.meta.env.DEV) {
          console.log('download-ready:', data);
        }
        const existingDownload = get().downloads[data.download_id];
        if (existingDownload) {
          get().upsertDownload({
            ...existingDownload,
            state: data.state,
            file_size_mb: data.file_size_mb,
            progress_message: data.progress_message,
          });
        }
      });

      // Download started
      socket.on('download-started', (data) => {
        if (import.meta.env.DEV) {
          console.log('download-started:', data);
        }
        const existingDownload = get().downloads[data.download_id];
        if (existingDownload) {
          get().upsertDownload({
            ...existingDownload,
            state: data.state,
          });
        }
      });

      // Download error
      socket.on('download-error', (data) => {
        if (import.meta.env.DEV) {
          console.log('download-error:', data);
        }
        const existingDownload = get().downloads[data.download_id];
        if (existingDownload) {
          get().upsertDownload({
            ...existingDownload,
            state: data.state,
            error_message: data.error_message,
            progress_message: data.progress_message,
          });
        }
      });

      // Download completed
      socket.on('download-downloaded', (data) => {
        if (import.meta.env.DEV) {
          console.log('download-downloaded:', data);
        }
        const existingDownload = get().downloads[data.download_id];
        if (existingDownload) {
          get().upsertDownload({
            ...existingDownload,
            state: data.state,
            downloaded_at: data.downloaded_at,
          });
        }
      });
    });
  },
}));

export default useDownloadStore;

import { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import axios from 'axios';

export const useAsyncData = (
  url = '',
  initialState = null,
  dependecies = []
) => {
  const [data, setData] = useState(initialState);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await axios.get(url);
        console.log(resp.data);
        setData(resp.data);
      } catch (err) {
        console.log(err.response.data);
        setError(err.response.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [...dependecies]);

  return [data, isLoading, error];
};

export const useOpenProjectDialog = (callback = () => {}) => {
  useEffect(() => {
    ipcRenderer.on('selected-project', async (event, _path) => {
      callback(_path);
    });
    return () => ipcRenderer.removeAllListeners(['selected-project']);
  }, []);

  return () => ipcRenderer.send('open-project');
};

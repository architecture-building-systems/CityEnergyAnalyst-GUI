import { createContext, useEffect, useState } from 'react';
import { apiClient } from 'lib/api/axios';

export const MapFormContext = createContext();

export const useFetchDatabases = () => {
  const [databases, setDatabases] = useState([]);

  const fetchDatabases = async () => {
    const { data } = await apiClient.get(`/api/databases/region`);
    return data;
  };

  useEffect(() => {
    fetchDatabases().then(({ regions }) => setDatabases(regions));
  }, []);

  return databases;
};

export const useFetchWeather = () => {
  const [weather, setWeather] = useState([]);

  const fetchWeather = async () => {
    const { data } = await apiClient.get(`/api/weather`);
    return data;
  };

  useEffect(() => {
    fetchWeather().then(({ weather }) => setWeather(weather));
  }, []);

  return weather;
};

export const useCreateScenario = (projectPath, { onSuccess }) => {
  const [formData, setFormData] = useState({});
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState();

  const createScenario = async (data) => {
    setError(null);
    setFetching(true);

    try {
      const formattedData = {};

      Object.keys(data).forEach((key) => {
        // Convert objects to strings
        if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
          formattedData[key] = JSON.stringify(data[key]);
        } else {
          formattedData[key] = data[key];
        }
      });
      formattedData['project'] = projectPath;

      const response = await apiClient.postForm(
        `/api/project/scenario/v2`,
        formattedData,
      );
      onSuccess?.(response.data);
    } catch (error) {
      console.log(error?.response?.data || error);
      setError(error?.response?.data || error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (formData?.scenario_name && projectPath) {
      createScenario(formData);
    }
  }, [formData, projectPath]);

  return { setFormData, fetching, error };
};

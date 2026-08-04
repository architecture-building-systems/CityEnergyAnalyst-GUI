import { createContext, useEffect, useState } from 'react';
import { apiClient } from 'lib/api/axios';
import { scenarioHeaders } from 'lib/api/scenarioContext';

export const MapFormContext = createContext();

export const useFetchDatabases = () => {
  const [databases, setDatabases] = useState([]);

  const fetchDatabases = async () => {
    const { data } = await apiClient.get(`/databases/region`);
    return data;
  };

  useEffect(() => {
    fetchDatabases()
      .then(({ regions }) => setDatabases(regions))
      .catch(console.error);
  }, []);

  return databases;
};

export const useFetchWeather = () => {
  const [weather, setWeather] = useState([]);

  const fetchWeather = async () => {
    const { data } = await apiClient.get(`/weather/`);
    return data;
  };

  useEffect(() => {
    fetchWeather()
      .then(({ weather }) => setWeather(weather))
      .catch(console.error);
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
      const response = await apiClient.postForm(
        `/project/scenario`,
        formattedData,
        { headers: scenarioHeaders({ project: projectPath }) },
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

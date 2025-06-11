import { createContext, useEffect, useState } from 'react';
import { apiClient } from '../../../api/axios';

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

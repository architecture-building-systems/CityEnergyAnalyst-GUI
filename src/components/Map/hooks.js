import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiClient } from '../../api/axios';

export const getGeocodeLocation = async (address) => {
  try {
    const _address = encodeURIComponent(address);
    const resp = await axios.get(
      `https://nominatim.openstreetmap.org/?format=json&q=${_address}&limit=1`,
    );
    if (resp?.data && resp.data.length) {
      return resp.data[0];
    } else return null;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const useGeocodeLocation = (onLocationResult) => {
  const [loading, setLoading] = useState(false);
  const [locationAddress, setAddress] = useState(null);

  const onSearch = async (searchAddress) => {
    if (searchAddress.trim().length === 0) return;

    setLoading(true);
    setAddress(null);
    try {
      const data = await getGeocodeLocation(searchAddress);
      if (data === null) {
        throw new Error('Location not found.');
      }

      const { lat, lon, boundingbox } = data;
      const location = {
        ...data,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        zoom: 16,
        // Rearrange bbox to match mapbox format
        boundingbox: [
          boundingbox[2],
          boundingbox[0],
          boundingbox[3],
          boundingbox[1],
        ],
      };
      onLocationResult?.(location);
      setAddress(location);
    } catch (err) {
      console.error(err);
      setAddress(err);
    } finally {
      setLoading(false);
    }
  };

  return { locationAddress, searchAddress: onSearch, loading };
};

export const useCameraForBounds = (mapRef, onChange) => {
  const [location, setLocation] = useState();

  // Use mapbox to determine zoom level based on bbox
  useEffect(() => {
    if (location?.boundingbox && mapRef.current) {
      const mapbox = mapRef.current;
      const cameraOptions = mapbox.cameraForBounds(location.boundingbox, {
        maxZoom: 18,
        padding: 20,
      });
      onChange?.({ cameraOptions, location });
    }
  }, [location]);

  return { setLocation };
};

export const useFetchBuildingsFromPath = (onFetchedBuildings) => {
  const [buildings, setBuildings] = useState();
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState();

  const fetchBuildings = async (path) => {
    setError(null);
    setFetching(true);

    if (!path) {
      setBuildings(null);
      setFetching(false);
      return;
    }

    try {
      const resp = await apiClient.get(`/api/geometry/buildings`, {
        params: {
          path,
        },
      });
      setBuildings(resp.data);
      onFetchedBuildings?.(resp.data);
    } catch (error) {
      console.log(error);

      setBuildings(null);
      setError(error);
    } finally {
      setFetching(false);
    }
  };

  return { fetchBuildings, buildings, fetching, error };
};

export const useFetchBuildings = (onFetchedBuildings) => {
  const [polygon, setPolygon] = useState();
  const [buildings, setBuildings] = useState();
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState();

  const fetchBuildings = async (polygon) => {
    setError(null);
    setFetching(true);
    try {
      const resp = await apiClient.get(`/api/geometry/buildings`, {
        params: {
          generate: true,
          polygon: JSON.stringify(polygon),
        },
      });
      setBuildings(resp.data);
      onFetchedBuildings?.(resp.data);
    } catch (error) {
      console.log(error);

      setBuildings(null);
      setError(error);
    } finally {
      setFetching(false);
    }
  };

  // Only fetch buildings if polygon changes
  useEffect(() => {
    if (polygon && polygon?.features?.length) {
      fetchBuildings(polygon);
    } else {
      setBuildings(null);
    }
  }, [polygon]);

  return { fetchBuildings: setPolygon, buildings, fetching, error };
};

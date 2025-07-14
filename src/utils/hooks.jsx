import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import useNavigationStore from 'stores/navigationStore';

export const useAsyncData = (
  url = '',
  initialState = null,
  dependecies = [],
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
        console.error(err.response.data);
        setError(err.response.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [...dependecies]);

  return [data, isLoading, error];
};

export const useEventListener = (eventName, handler, element = window) => {
  const savedHandler = useRef();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // Make sure element supports addEventListener
    const isSupported = element && element.addEventListener;

    if (!isSupported) return;

    const eventListener = (event) => savedHandler.current(event);
    element.addEventListener(eventName, eventListener);

    // Remove event listener on cleanup
    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
};

export const useChangeRoute = (route) => {
  const { push } = useNavigationStore();
  return () => push(route);
};

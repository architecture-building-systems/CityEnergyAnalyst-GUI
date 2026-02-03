import { useState, useEffect, useCallback } from 'react';
import { apiClient } from 'lib/api/axios';

const useCheckMissingInputs = (tool) => {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState();

  const fetch = useCallback(
    async (parameters) => {
      setFetching(true);
      try {
        await apiClient.post(`/api/tools/${tool}/check`, parameters);
        setError(null);
      } catch (err) {
        setError(err.response.data?.detail?.script_suggestions);
      } finally {
        setFetching(false);
      }
    },
    [tool],
  );

  // reset error when tool changes
  useEffect(() => {
    setError();
  }, [tool]);

  return { fetch, fetching, error };
};

export default useCheckMissingInputs;

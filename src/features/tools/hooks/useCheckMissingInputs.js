import { useState, useEffect, useCallback } from 'react';
import { apiClient } from 'lib/api/axios';

const useCheckMissingInputs = (tool) => {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState();

  const check = useCallback(
    async (parameters) => {
      if (!tool) {
        console.warn('Tool not specified for checking missing inputs.');
        return;
      }

      setChecking(true);
      try {
        await apiClient.post(`/api/tools/${tool}/check`, parameters);
        setError(null);
      } catch (err) {
        if (err.response?.status == 400) {
          setError(err.response?.data?.detail?.script_suggestions);
        } else if (err.response?.status == 500) {
          setError(err.response?.data?.detail || 'Internal server error');
        }
      } finally {
        setChecking(false);
      }
    },
    [tool],
  );

  // reset error when tool changes
  useEffect(() => {
    setError();
  }, [tool]);

  return { check, checking, error };
};

export default useCheckMissingInputs;

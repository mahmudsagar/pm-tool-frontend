import { useState, useCallback } from 'react';

const useApi = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callApi = useCallback(async (url, config = {}, onSuccess) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (onSuccess) {
        onSuccess();
      }
    }
  }, []);

  return { data, loading, error, callApi };
};

export default useApi;

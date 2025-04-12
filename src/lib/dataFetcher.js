import { useState, useCallback } from 'react';

const useApi = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callApi = useCallback(async (url, config = {}, onSuccess) => {
    console.log("API Request:", { url, config });
    setLoading(true);
    setError(null);
    let tempData = null;
    try {
      // Get token directly from localStorage
      const token = localStorage.getItem('token');
      console.log("Using token:", token ? "Present" : "Missing");
      
      // Prepare headers with the token
      const headers = {
        'Content-Type': 'application/json',
        ...config.headers
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const updatedConfig = {
        ...config,
        headers
      };
      
      console.log("Fetch config:", updatedConfig);
      const response = await fetch(url, updatedConfig);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", { 
          status: response.status, 
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
      }
      
      const result = await response.json();
      console.log("API Success:", result);
      setData(result.data);
      tempData = result.data;
    } catch (err) {
      console.error("API Call Failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      if (onSuccess) {
        onSuccess(tempData);
      }
    }
  }, []);

  return { data, loading, error, callApi };
};

export default useApi;

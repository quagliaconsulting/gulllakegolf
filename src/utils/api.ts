import axios from 'axios';

// Create axios instance with auth token
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper functions for common API operations
export const fetchData = async (url: string) => {
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
};

export const postData = async (url: string, data: any) => {
  try {
    const response = await api.post(url, data);
    return response.data;
  } catch (error) {
    console.error(`Error posting data to ${url}:`, error);
    throw error;
  }
};

export const putData = async (url: string, data: any) => {
  try {
    const response = await api.put(url, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating data at ${url}:`, error);
    throw error;
  }
};

export const deleteData = async (url: string) => {
  try {
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    console.error(`Error deleting data at ${url}:`, error);
    throw error;
  }
};

export default api;
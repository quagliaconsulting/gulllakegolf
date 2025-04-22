import axios from 'axios';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  statusCode: number;
};

/**
 * Base axios instance with common configuration
 */
export const api = axios.create({
  // Empty baseURL to avoid prefix duplication - we'll include /api in each request
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get token from localStorage if available (client-side only)
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

/**
 * Default fetcher for SWR that handles API responses
 */
export const fetcher = async (url: string) => {
  try {
    console.log('API Request:', url);
    const response = await api.get(url);
    console.log('API Response Status:', response.status);
    
    // Handle API response format (success/error fields)
    if (response.data?.success === false) {
      console.error('API Error in response:', response.data.error);
      throw new Error(response.data.error || 'API error');
    }
    
    // For compatibility with existing code, handle both formats
    // New: { success: true, data: { ... } }
    // Old: { match: { ... } }
    return response.data.data || response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorMsg = error.response?.data?.error || error.message;
      console.error(`API Error (${status}):`, errorMsg, 'URL:', url);
      
      // Handle common error cases
      if (status && status === 404) {
        // For "not found" errors, return empty data instead of failing
        console.log('Returning empty data for 404 error');
        
        // Return appropriate empty structure based on URL pattern
        if (url.includes('/leaderboard')) {
          return { teamStandings: [], playerStandings: [] };
        } else if (url.includes('/schedule')) {
          return { schedules: [] };
        } else if (url.includes('/scores')) {
          return { match: { holes: [] } };
        } else {
          return {};
        }
      } else if (status && status === 401) {
        // Authentication errors should be handled by the auth system
        console.error('Authentication required');
        throw new Error('Authentication required');
      } else if (status && status === 403) {
        // Forbidden errors
        console.error('Access denied');
        throw new Error('You do not have permission to access this resource');
      } else if (status && status >= 500) {
        // Server errors
        console.error('Server error');
        throw new Error('Server error occurred. Please try again later.');
      }
      
      throw new Error(`API error: ${errorMsg}`);
    }
    console.error('Non-Axios error in fetcher:', error);
    throw error;
  }
};

/**
 * Use API endpoint with SWR
 */
export function useApi<T = any>(
  url: string | null, 
  options?: SWRConfiguration
): SWRResponse<T, Error> {
  return useSWR<T, Error>(url, fetcher, {
    revalidateOnFocus: false,
    ...options
  });
}

/**
 * Post data to API endpoint
 */
export const postApi = async <T = any, R = any>(url: string, data: T): Promise<R> => {
  try {
    const response = await api.post<ApiResponse<R>>(url, data);
    
    if (response.data?.success === false) {
      throw new Error(response.data.error || 'API error');
    }
    
    return response.data.data as R;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(`API error: ${error.response.data.error}`);
    }
    throw error;
  }
};

/**
 * Put data to API endpoint
 */
export const putApi = async <T = any, R = any>(url: string, data: T): Promise<R> => {
  try {
    const response = await api.put<ApiResponse<R>>(url, data);
    
    if (response.data?.success === false) {
      throw new Error(response.data.error || 'API error');
    }
    
    return response.data.data as R;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(`API error: ${error.response.data.error}`);
    }
    throw error;
  }
};

/**
 * Delete resource at API endpoint
 */
export const deleteApi = async <R = any>(url: string): Promise<R> => {
  try {
    const response = await api.delete<ApiResponse<R>>(url);
    
    if (response.data?.success === false) {
      throw new Error(response.data.error || 'API error');
    }
    
    return response.data.data as R;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(`API error: ${error.response.data.error}`);
    }
    throw error;
  }
};
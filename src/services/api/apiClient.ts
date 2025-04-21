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
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Default fetcher for SWR that handles API responses
 */
export const fetcher = async (url: string) => {
  try {
    const response = await api.get(url);
    
    // Handle API response format (success/error fields)
    if (response.data?.success === false) {
      throw new Error(response.data.error || 'API error');
    }
    
    // For compatibility with existing code, handle both formats
    // New: { success: true, data: { ... } }
    // Old: { match: { ... } }
    return response.data.data || response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(`API error: ${error.response.data.error}`);
    }
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
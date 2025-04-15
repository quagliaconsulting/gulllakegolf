import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (name: string, email: string, password: string, handicapIndex?: number) => Promise<{ success: boolean; error?: string }>;
  isAdmin: () => boolean;
  isTeamCaptain: () => boolean;
  isAuthenticated: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if the user is already logged in
    const token = localStorage.getItem('token');
    
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token: string) => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(response.data);
    } catch (error) {
      // If the token is invalid, remove it
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      
      // Save token to localStorage and cookies
      localStorage.setItem('token', response.data.token);
      
      // Set cookie for the middleware with HttpOnly=false so it's accessible to JavaScript
      document.cookie = `token=${response.data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      
      // Also set as a secondary cookie (backup attempt)
      document.cookie = `auth_token=${response.data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      
      console.log('Cookies set:', document.cookie);
      
      // Set user data
      setUser(response.data.user);
      
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'An error occurred during login'
      };
    }
  };

  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Remove token from cookies
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    
    // Clear user data
    setUser(null);
    
    // Redirect to login page
    router.push('/auth/signin');
  };

  const register = async (name: string, email: string, password: string, handicapIndex?: number) => {
    try {
      const response = await axios.post('/api/auth/register', { 
        name, 
        email, 
        password,
        handicapIndex
      });
      
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'An error occurred during registration'
      };
    }
  };

  const isAdmin = () => user?.role === 'ADMIN';
  const isTeamCaptain = () => user?.role === 'TEAM_CAPTAIN';
  const isAuthenticated = () => !!user;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      register,
      isAdmin,
      isTeamCaptain,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
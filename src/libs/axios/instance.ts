import environment from "../../config/environment";
import { SessionExtended } from "../../types/Auth";
import axios, { InternalAxiosRequestConfig, AxiosRequestConfig } from "axios";
import { getSession, signOut } from "next-auth/react";

// Define a custom request config interface with our additional properties
export interface CustomRequestConfig extends AxiosRequestConfig {
  noRedirect?: boolean;
}

// Create a custom event for loading state
const loadingEvent = new CustomEvent('apiLoadingChange');

const API_URL = environment.API_URL || 'http://localhost:3000';

const instance = axios.create({
  baseURL: API_URL.replace(/\/+$/, ''), // Remove trailing slashes if any
  timeout: 60 * 1000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Allow absolute URLs to handle both relative and full URLs
  allowAbsoluteUrls: true
});

// Track active requests
let activeRequests = 0;

const updateLoading = (isLoading: boolean) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apiLoadingChange', { 
      detail: { isLoading } 
    }));
  }
};

// Request interceptor
instance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    activeRequests++;
    updateLoading(true);

    try {
      const session = await getSession() as SessionExtended | null;
      
      // Add auth header if we have a token
      if (session?.accessToken) {
        config.headers.set('Authorization', `Bearer ${session.accessToken}`);
      }
      
      // Don't transform FormData
      if (config.data instanceof FormData) {
        config.transformRequest = [(data) => data];
        config.headers.delete('Content-Type');
      }

      return config;
    } catch (error) {
      return config;
    }
  },
  (error) => {
    activeRequests--;
    if (activeRequests === 0) {
      updateLoading(false);
    }
    return Promise.reject(error);
  }
);

// Response interceptor
instance.interceptors.response.use(
  (response) => {
    activeRequests--;
    if (activeRequests === 0) {
      updateLoading(false);
    }
    return response;
  },
  async (error) => {
    activeRequests--;
    if (activeRequests === 0) {
      updateLoading(false);
    }

    if (!error.response) {
      return Promise.reject(error);
    }

    // Add custom property to indicate auth error for handling in components
    if (error.response.status === 401 || error.response.status === 403) {
      error.isAuthError = true;
    }

    // Handle 403 errors (unauthorized)
    if (error.response.status === 403) {
      // Check for noRedirect flag in request config
      const noRedirect = error.config.noRedirect;
      
      // Skip automatic redirect for certain endpoints
      const skipRedirectEndpoints = ['/students/me', '/teachers/me'];
      const shouldSkipRedirect = skipRedirectEndpoints.some(endpoint => 
        error.config.url?.includes(endpoint)
      );
      
      // Don't redirect on login errors, when noRedirect flag is set, or for skip endpoints
      if (!error.config.url?.includes('/auth/login') && !noRedirect && !shouldSkipRedirect) {
        if (typeof window !== 'undefined') {
          await signOut({ 
            redirect: true,
            callbackUrl: '/auth/login'
          });
        }
      }
    }

    return Promise.reject(error);
  }
);

export default instance;

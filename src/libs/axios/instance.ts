import environment from "../../config/environment";
import { SessionExtended } from "../../types/Auth";
import axios, { InternalAxiosRequestConfig, AxiosRequestConfig } from "axios";
import { getSession, signOut } from "next-auth/react";

export interface CustomRequestConfig extends AxiosRequestConfig {
  noRedirect?: boolean;
}

const loadingEvent = new CustomEvent('apiLoadingChange');

const API_URL = environment.API_URL || 'http://localhost:3000';

const instance = axios.create({
  baseURL: API_URL.replace(/\/+$/, ''),
  timeout: 60 * 1000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  allowAbsoluteUrls: true
});

let activeRequests = 0;

const updateLoading = (isLoading: boolean) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apiLoadingChange', { 
      detail: { isLoading } 
    }));
  }
};

let cachedSession: SessionExtended | null = null;
let sessionCacheTime: number = 0;
const SESSION_CACHE_DURATION = 30 * 1000;

const getSessionCached = async (): Promise<SessionExtended | null> => {
  const currentTime = Date.now();
  
  if (cachedSession && (currentTime - sessionCacheTime < SESSION_CACHE_DURATION)) {
    return cachedSession;
  }
  
  const newSession = await getSession() as SessionExtended | null;
  cachedSession = newSession;
  sessionCacheTime = currentTime;
  
  return newSession;
};

instance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    activeRequests++;
    updateLoading(true);

    try {
      const session = await getSessionCached();
      
      if (session?.accessToken) {
        config.headers.set('Authorization', `Bearer ${session.accessToken}`);
      }
      
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

    if (error.response.status === 401 || error.response.status === 403) {
      cachedSession = null;
      error.isAuthError = true;
    }

    if (error.response.status === 403) {
      const noRedirect = error.config.noRedirect;
      
      const skipRedirectEndpoints = ['/students/me', '/teachers/me'];
      const shouldSkipRedirect = skipRedirectEndpoints.some(endpoint => 
        error.config.url?.includes(endpoint)
      );
      
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

import axios, { AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { authService } from '@/features/auth/services/auth.service';
import { accessTokenStore } from '@/features/auth/services/access-token.store';
import { isAccessTokenExpired, isTerminalSessionError } from '@/features/auth/services/auth-errors';
import type { AuthSessionResponse } from '@/features/auth/types/auth.types';
import { apiClient } from '@/services/api/api-client';

interface AuthInterceptorHandlers {
  onSessionRefreshed?: (session: AuthSessionResponse) => void;
  onSessionInvalidated?: () => void;
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  __accessTokenRetry?: boolean;
}

const refreshCooldownMs = 2_000;
let refreshPromise: Promise<AuthSessionResponse> | null = null;
let refreshRetryAt = 0;
let refreshError: unknown;
let handlers: AuthInterceptorHandlers = {};

function getPath(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url, apiClient.defaults.baseURL).pathname;
  } catch {
    return url.split('?')[0] ?? '';
  }
}

function skipsBearerToken(url: string | undefined): boolean {
  const path = getPath(url).replace(/\/+$/, '');
  return [
    '/auth/login',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/set-password',
  ].some((suffix) => path.endsWith(suffix));
}

export function installAuthInterceptors(nextHandlers: AuthInterceptorHandlers): () => void {
  handlers = nextHandlers;

  const requestId = apiClient.interceptors.request.use((config) => {
    config.headers = AxiosHeaders.from(config.headers);
    config.withCredentials = true;

    if (skipsBearerToken(config.url)) {
      config.headers.delete('Authorization');
    } else {
      const token = accessTokenStore.get();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.delete('Authorization');
      }
    }

    return config;
  });

  const responseId = apiClient.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error) || !isAccessTokenExpired(error) || !error.config) {
        return Promise.reject(error);
      }

      const request = error.config as RetriableRequestConfig;
      if (request.__accessTokenRetry || skipsBearerToken(request.url)) {
        return Promise.reject(error);
      }

      request.__accessTokenRetry = true;

      try {
        const session = await refreshAccessToken();
        request.headers = AxiosHeaders.from(request.headers);
        request.headers.set('Authorization', `Bearer ${session.accessToken}`);
        return await apiClient(request);
      } catch (refreshFailure) {
        return Promise.reject(refreshFailure);
      }
    },
  );

  return () => {
    apiClient.interceptors.request.eject(requestId);
    apiClient.interceptors.response.eject(responseId);
    if (handlers === nextHandlers) {
      handlers = {};
    }
  };
}

export function refreshAccessToken(): Promise<AuthSessionResponse> {
  if (refreshPromise) {
    return refreshPromise;
  }

  if (Date.now() < refreshRetryAt) {
    return Promise.reject(refreshError);
  }

  refreshPromise = authService
    .refresh()
    .then((session) => {
      accessTokenStore.set(session.accessToken);
      refreshRetryAt = 0;
      refreshError = undefined;
      handlers.onSessionRefreshed?.(session);
      return session;
    })
    .catch((error: unknown) => {
      if (isTerminalSessionError(error)) {
        accessTokenStore.clear();
        handlers.onSessionInvalidated?.();
      } else {
        refreshRetryAt = Date.now() + refreshCooldownMs;
        refreshError = error;
      }
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

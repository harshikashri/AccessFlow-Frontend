import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  default as axios,
} from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { accessTokenStore } from '@/features/auth/services/access-token.store';
import { installAuthInterceptors } from '@/features/auth/services/auth-interceptors';
import { apiClient } from '@/services/api/api-client';

const session = {
  accessToken: 'fresh-access-token',
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole: null,
    organizationId: 'org-1',
  },
};

let refreshCalls = 0;
let protectedCalls = 0;
let refreshAuthorization: unknown = null;
let refreshIncludesCredentials = false;
let protectedErrorCode = 'TOKEN_EXPIRED';
let alwaysExpired = false;
let cleanupInterceptors: (() => void) | undefined;
let originalAdapter: AxiosAdapter;

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
    headers: new AxiosHeaders(),
    config,
  };
}

function unauthorized(config: InternalAxiosRequestConfig, code: string): AxiosError {
  return new AxiosError(
    'Unauthorized',
    'ERR_BAD_REQUEST',
    config,
    undefined,
    response(config, { success: false, message: 'Unauthorized', code }, 401),
  );
}

const adapter: AxiosAdapter = async (config) => {
  if (config.url?.endsWith('/auth/refresh')) {
    refreshCalls += 1;
    refreshAuthorization = AxiosHeaders.from(config.headers).get('Authorization');
    refreshIncludesCredentials = config.withCredentials === true;
    await new Promise((resolve) => window.setTimeout(resolve, 15));
    return response(config, { success: true, data: session });
  }

  protectedCalls += 1;
  const authorization = AxiosHeaders.from(config.headers).get('Authorization');
  if (authorization !== 'Bearer fresh-access-token' || alwaysExpired) {
    throw unauthorized(config, protectedErrorCode);
  }

  return response(config, { success: true, data: { ok: true } });
};

beforeEach(() => {
  refreshCalls = 0;
  protectedCalls = 0;
  refreshAuthorization = null;
  refreshIncludesCredentials = false;
  protectedErrorCode = 'TOKEN_EXPIRED';
  alwaysExpired = false;
  originalAdapter = axios.getAdapter(apiClient.defaults.adapter);
  apiClient.defaults.adapter = adapter;
  accessTokenStore.set('expired-access-token');
  cleanupInterceptors = installAuthInterceptors({});
});

afterEach(() => {
  cleanupInterceptors?.();
  cleanupInterceptors = undefined;
  apiClient.defaults.adapter = originalAdapter;
  accessTokenStore.clear();
});

describe('auth response interceptors', () => {
  it('shares one refresh across concurrent expired requests', async () => {
    const [first, second] = await Promise.all([
      apiClient.get('/protected/first'),
      apiClient.get('/protected/second'),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(4);
    expect(accessTokenStore.get()).toBe('fresh-access-token');
  });

  it('refreshes only for the TOKEN_EXPIRED response code', async () => {
    protectedErrorCode = 'INVALID_TOKEN';

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      response: { status: 401, data: { code: 'INVALID_TOKEN' } },
    });

    expect(refreshCalls).toBe(0);
    expect(protectedCalls).toBe(1);
  });

  it('sends refresh with cookies and without a bearer token', async () => {
    await apiClient.post('/auth/refresh');

    expect(refreshAuthorization).toBeUndefined();
    expect(refreshIncludesCredentials).toBe(true);
  });

  it('retries an original request no more than once', async () => {
    alwaysExpired = true;

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      response: { status: 401, data: { code: 'TOKEN_EXPIRED' } },
    });

    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
  });
});

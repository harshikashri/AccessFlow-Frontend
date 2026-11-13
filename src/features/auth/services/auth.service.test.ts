import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '@/features/auth/services/auth.service';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/services/api/api-client', () => ({
  apiClient: apiClientMock,
}));

const session = {
  accessToken: 'access-token',
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole: null,
    organizationId: 'org-1',
  },
};

beforeEach(() => {
  apiClientMock.get.mockReset();
  apiClientMock.post.mockReset();
});

describe('auth service API contracts', () => {
  it('sends login data to the verified endpoint and unwraps the session', async () => {
    apiClientMock.post.mockResolvedValue({ data: { success: true, data: session } });

    await expect(
      authService.login({
        email: 'user@example.com',
        password: 'StrongPass!1',
        organizationId: 'org-1',
      }),
    ).resolves.toEqual(session);

    expect(apiClientMock.post).toHaveBeenCalledWith('/auth/login', {
      email: 'user@example.com',
      password: 'StrongPass!1',
      organizationId: 'org-1',
    });
  });

  it('uses the cookie-backed refresh route without sending a refresh token body', async () => {
    apiClientMock.post.mockResolvedValue({ data: { success: true, data: session } });

    await expect(authService.refresh()).resolves.toEqual(session);

    expect(apiClientMock.post).toHaveBeenCalledWith('/auth/refresh');
  });

  it('uses the verified password-flow request shapes', async () => {
    const payload = {
      token: 'one-time-token',
      password: 'StrongPass!1',
      confirmPassword: 'StrongPass!1',
    };
    apiClientMock.post.mockResolvedValue({
      data: { success: true, message: 'Password updated', data: {} },
    });

    await expect(authService.forgotPassword('user@example.com')).resolves.toBe('Password updated');
    await expect(authService.resetPassword(payload)).resolves.toBe('Password updated');
    await expect(authService.setPassword(payload)).resolves.toBe('Password updated');

    expect(apiClientMock.post).toHaveBeenNthCalledWith(1, '/auth/forgot-password', {
      email: 'user@example.com',
    });
    expect(apiClientMock.post).toHaveBeenNthCalledWith(2, '/auth/reset-password', payload);
    expect(apiClientMock.post).toHaveBeenNthCalledWith(3, '/auth/set-password', payload);
  });

  it('returns the backend logout-all count', async () => {
    apiClientMock.post.mockResolvedValue({
      data: { success: true, data: { revokedCount: 3 } },
    });

    await expect(authService.logoutAll()).resolves.toBe(3);
    expect(apiClientMock.post).toHaveBeenCalledWith('/auth/logout-all');
  });
});

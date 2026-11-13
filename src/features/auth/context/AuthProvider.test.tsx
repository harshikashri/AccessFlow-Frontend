import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { useAuth } from '@/features/auth/context/useAuth';
import { accessTokenStore } from '@/features/auth/services/access-token.store';
import type { PublicUser } from '@/features/auth/types/auth.types';

const authServiceMock = vi.hoisted(() => ({
  login: vi.fn(),
  refresh: vi.fn(),
  currentUser: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  setPassword: vi.fn(),
}));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: authServiceMock,
}));

const user: PublicUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'user@example.com',
  platformRole: null,
  organizationId: 'org-1',
};

const session = { accessToken: 'memory-only-token', user };

function Probe() {
  const auth = useAuth();

  return (
    <div>
      <output data-testid="status">{auth.status}</output>
      <output data-testid="error">{auth.error ?? ''}</output>
      <button onClick={() => void auth.login({ email: user.email, password: 'StrongPass!1' })}>
        Sign in
      </button>
      <button onClick={() => void auth.logoutAll()}>Sign out all</button>
    </div>
  );
}

function renderProvider(queryClient = new QueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  authServiceMock.login.mockReset().mockResolvedValue(session);
  authServiceMock.refresh.mockReset();
  authServiceMock.currentUser.mockReset().mockResolvedValue(user);
  authServiceMock.logout.mockReset().mockResolvedValue(undefined);
  authServiceMock.logoutAll.mockReset().mockResolvedValue(2);
  authServiceMock.forgotPassword.mockReset();
  authServiceMock.resetPassword.mockReset();
  authServiceMock.setPassword.mockReset();
  accessTokenStore.clear();
});

afterEach(() => {
  accessTokenStore.clear();
  vi.restoreAllMocks();
});

describe('AuthProvider', () => {
  it('restores a session from the HttpOnly-cookie refresh flow', async () => {
    authServiceMock.refresh.mockResolvedValue(session);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(authServiceMock.currentUser).toHaveBeenCalledOnce();
    expect(accessTokenStore.get()).toBe('memory-only-token');
  });

  it('returns to an unauthenticated state when refresh rejects the cookie session', async () => {
    authServiceMock.refresh.mockRejectedValue({
      isAxiosError: true,
      message: 'Session expired',
      response: {
        status: 401,
        data: { success: false, code: 'INVALID_REFRESH_TOKEN', message: 'Session expired' },
      },
    });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(authServiceMock.currentUser).not.toHaveBeenCalled();
    expect(accessTokenStore.get()).toBeNull();
  });

  it('clears private query cache and the in-memory token after logout-all', async () => {
    authServiceMock.refresh.mockResolvedValue(session);
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private-data'], { value: 'sensitive' });

    renderProvider(queryClient);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    fireEvent.click(screen.getByRole('button', { name: 'Sign out all' }));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(queryClient.getQueryData(['private-data'])).toBeUndefined();
    expect(accessTokenStore.get()).toBeNull();
    expect(authServiceMock.logoutAll).toHaveBeenCalledOnce();
  });

  it('does not persist credentials or access tokens in browser storage', async () => {
    authServiceMock.refresh.mockRejectedValue({
      isAxiosError: true,
      message: 'Session expired',
      response: {
        status: 401,
        data: { success: false, code: 'INVALID_REFRESH_TOKEN', message: 'Session expired' },
      },
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(setItem).not.toHaveBeenCalled();
    expect(accessTokenStore.get()).toBe('memory-only-token');
    setItem.mockRestore();
  });

  it('keeps network restoration failures distinct from invalid sessions', async () => {
    authServiceMock.refresh.mockRejectedValue(new Error('Network unavailable'));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unavailable'));
    expect(screen.getByTestId('error').textContent).toContain('Network unavailable');
    expect(accessTokenStore.get()).toBeNull();
  });
});

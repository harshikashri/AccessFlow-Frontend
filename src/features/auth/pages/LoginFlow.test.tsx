import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { useAuth } from '@/features/auth/context/useAuth';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { PublicRoute } from '@/routes/PublicRoute';

const authServiceMock = vi.hoisted(() => ({
  login: vi.fn(),
  refresh: vi.fn(),
  currentUser: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
}));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: authServiceMock,
}));

function GuestLoginPage() {
  const { isInitializing, isAuthenticated } = useAuth();

  return (
    <PublicRoute isInitializing={isInitializing} isAuthenticated={isAuthenticated}>
      <LoginPage />
    </PublicRoute>
  );
}

beforeEach(() => {
  authServiceMock.login.mockReset();
  authServiceMock.refresh.mockReset().mockRejectedValue({
    isAxiosError: true,
    response: {
      status: 401,
      data: { success: false, code: 'INVALID_REFRESH_TOKEN', message: 'Session expired' },
    },
  });
  authServiceMock.currentUser.mockReset();
  authServiceMock.logout.mockReset();
  authServiceMock.logoutAll.mockReset();
});

describe('sign-in flow', () => {
  it('keeps the login form mounted and displays an actionable error when the API is unreachable', async () => {
    const user = userEvent.setup();
    authServiceMock.login.mockRejectedValue({
      isAxiosError: true,
      message: 'Network Error',
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter>
            <GuestLoginPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    );

    await screen.findByRole('button', { name: 'Sign in' });
    await user.type(screen.getByLabelText('Work email', { exact: false }), 'user@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'StrongPass!1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Unable to reach the server. Check your connection and try again.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(authServiceMock.login).toHaveBeenCalledOnce();
    expect(authServiceMock.currentUser).not.toHaveBeenCalled();
  });
});

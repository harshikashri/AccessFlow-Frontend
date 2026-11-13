import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/features/auth/pages/LoginPage';

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  restoreSession: vi.fn(),
}));

vi.mock('@/features/auth/context/useAuth', () => ({
  useAuth: () => ({
    status: 'unauthenticated',
    error: null,
    login: authMocks.login,
    restoreSession: authMocks.restoreSession,
  }),
}));

beforeEach(() => {
  authMocks.login.mockReset();
  authMocks.restoreSession.mockReset();
});

describe('LoginPage', () => {
  it('uses organization IDs returned by the backend and preserves the intended destination', async () => {
    const user = userEvent.setup();
    authMocks.login
      .mockRejectedValueOnce({
        isAxiosError: true,
        message: 'Choose an organization',
        response: {
          status: 400,
          data: {
            success: false,
            code: 'ORGANIZATION_SELECTION_REQUIRED',
            message: 'Choose an organization',
            details: { organizations: ['org-1', 'org-2'] },
          },
        },
      })
      .mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: { pathname: '/', search: '?view=private' } },
          },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div data-testid="destination">Private workspace</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Work email', { exact: false }), 'user@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'StrongPass!1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const organization = await screen.findByLabelText('Organization', { exact: false });
    expect(organization.querySelectorAll('option')).toHaveLength(3);

    await user.selectOptions(organization, 'org-2');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(authMocks.login).toHaveBeenLastCalledWith({
        email: 'user@example.com',
        password: 'StrongPass!1',
        organizationId: 'org-2',
      }),
    );
    expect(await screen.findByTestId('destination')).toBeTruthy();
  });

  it('does not submit without required credentials', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(authMocks.login).not.toHaveBeenCalled();
  });
});

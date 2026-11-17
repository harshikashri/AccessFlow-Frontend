import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { SecuritySettingsPage } from '@/features/settings/pages/SecuritySettingsPage';
import { SettingsOverviewPage } from '@/features/settings/pages/SettingsOverviewPage';

const authMocks = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
}));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    forgotPassword: authMocks.forgotPassword,
  },
}));

const platformUser: AuthenticatedUser = {
  id: 'super-admin-1',
  name: 'Super Admin',
  email: 'admin@example.com',
  platformRole: 'SUPER_ADMIN',
  organizationId: null,
  authorization: {
    platformPermissions: [],
    organizationPermissions: [],
    departmentPermissions: {},
  },
};

const organizationUser: AuthenticatedUser = {
  id: 'organization-user-1',
  name: 'Organization Admin',
  email: 'organization-admin@example.com',
  platformRole: null,
  organizationId: 'organization-1',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['dashboard.view'],
    departmentPermissions: {},
  },
};

function createAuthContext(user: AuthenticatedUser = platformUser): AuthContextValue {
  return {
    status: 'authenticated',
    authorizationStatus: 'available',
    user,
    error: null,
    isInitializing: false,
    isAuthenticated: true,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    logoutAll: vi.fn().mockResolvedValue(0),
    restoreSession: vi.fn().mockResolvedValue(undefined),
    refreshCurrentUser: vi.fn().mockResolvedValue(user),
  };
}

beforeEach(() => {
  authMocks.forgotPassword.mockReset().mockResolvedValue('Reset request accepted.');
});

describe('SecuritySettingsPage for Super Admin', () => {
  it('requests a password reset email instead of accepting a new password directly', async () => {
    render(
      <AuthContext.Provider value={createAuthContext()}>
        <MemoryRouter initialEntries={['/settings/security']}>
          <SecuritySettingsPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: 'Security' })).toBeTruthy();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => {
      expect(authMocks.forgotPassword).toHaveBeenCalledWith(platformUser.email);
    });
    expect(await screen.findByText(/account email: admin@example\.com/i)).toBeTruthy();
    expect(screen.queryByText('Active sessions')).toBeNull();

    const settingsNavigation = screen.getByRole('navigation', { name: 'Settings navigation' });
    expect(within(settingsNavigation).getByRole('link', { name: 'Profile' })).toBeTruthy();
    expect(within(settingsNavigation).getByRole('link', { name: 'Security' })).toBeTruthy();
    expect(
      within(settingsNavigation).queryByRole('link', {
        name: /Overview|Preferences|Notifications|Organization/,
      }),
    ).toBeNull();
  });

  it('omits Overview, Preferences, and Notifications for Organization Admins', () => {
    render(
      <AuthContext.Provider value={createAuthContext(organizationUser)}>
        <MemoryRouter initialEntries={['/settings/security']}>
          <SecuritySettingsPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: 'Security' })).toBeTruthy();
    expect(screen.queryByText('Active sessions')).toBeNull();
    const settingsNavigation = screen.getByRole('navigation', { name: 'Settings navigation' });
    expect(within(settingsNavigation).getByRole('link', { name: 'Profile' })).toBeTruthy();
    expect(within(settingsNavigation).getByRole('link', { name: 'Security' })).toBeTruthy();
    expect(within(settingsNavigation).getByRole('link', { name: 'Organization' })).toBeTruthy();
    expect(
      within(settingsNavigation).queryByRole('link', {
        name: /Overview|Preferences|Notifications/,
      }),
    ).toBeNull();
  });

  it('redirects the removed settings overview to Profile', async () => {
    render(
      <AuthContext.Provider value={createAuthContext()}>
        <MemoryRouter initialEntries={['/settings']}>
          <Routes>
            <Route path="/settings" element={<SettingsOverviewPage />} />
            <Route path="/settings/profile" element={<p>Profile settings</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText('Profile settings')).toBeTruthy();
  });
});

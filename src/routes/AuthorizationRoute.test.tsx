import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenPage } from '@/app/pages/ForbiddenPage';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { AuthorizationRoute } from '@/routes/AuthorizationRoute';

const departmentId = '64b000000000000000000001';

function createContextValue(
  user: AuthenticatedUser | null,
  authorizationStatus: AuthContextValue['authorizationStatus'] = 'available',
): AuthContextValue {
  return {
    status: user ? 'authenticated' : 'unauthenticated',
    authorizationStatus,
    user,
    error: null,
    isInitializing: false,
    isAuthenticated: Boolean(user),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    logoutAll: vi.fn().mockResolvedValue(0),
    restoreSession: vi.fn().mockResolvedValue(undefined),
    refreshCurrentUser: vi.fn().mockResolvedValue(user),
  };
}

function renderUsersRoute(value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route
            path="/users"
            element={
              <AuthorizationRoute itemId="users">
                <p>Users workspace</p>
              </AuthorizationRoute>
            }
          />
          <Route path="/403" element={<ForbiddenPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

function tenantUser(
  departmentPermissions: Record<
    string,
    AuthenticatedUser['authorization']['organizationPermissions']
  > = {},
): AuthenticatedUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole: null,
    organizationId: 'org-1',
    authorization: {
      platformPermissions: [],
      organizationPermissions: [],
      departmentPermissions,
    },
  };
}

describe('AuthorizationRoute', () => {
  it('allows a direct route when the user has its required scoped permission', () => {
    renderUsersRoute(createContextValue(tenantUser({ [departmentId]: ['users.view'] })));

    expect(screen.getByText('Users workspace')).toBeTruthy();
  });

  it('redirects users without the required permission to the forbidden page', () => {
    renderUsersRoute(createContextValue(tenantUser()));

    expect(screen.getByText('Access not available')).toBeTruthy();
    expect(screen.queryByText('Users workspace')).toBeNull();
  });

  it('waits for authorization before rendering a protected page', () => {
    renderUsersRoute(createContextValue(tenantUser(), 'loading'));

    expect(screen.getByText('Checking your access')).toBeTruthy();
    expect(screen.queryByText('Users workspace')).toBeNull();
  });

  it('does not grant tenant access to a platform session', () => {
    const platformUser: AuthenticatedUser = {
      ...tenantUser(),
      platformRole: 'SUPER_ADMIN',
      organizationId: null,
    };
    renderUsersRoute(createContextValue(platformUser));

    expect(screen.getByText('Access not available')).toBeTruthy();
    expect(screen.queryByText('Users workspace')).toBeNull();
  });

  it('shows access-verification failure through the forbidden route when authorization is unavailable', () => {
    const user = tenantUser({ [departmentId]: ['users.view'] });
    renderUsersRoute(createContextValue(user, 'unavailable'));

    expect(screen.getByText('Access not available')).toBeTruthy();
    expect(screen.queryByText('Users workspace')).toBeNull();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });
});

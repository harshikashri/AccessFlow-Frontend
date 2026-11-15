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
          <Route path="/" element={<p>Workspace</p>} />
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

function renderRolesRoute(value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/roles']}>
        <Routes>
          <Route path="/" element={<p>Workspace</p>} />
          <Route
            path="/roles"
            element={
              <AuthorizationRoute itemId="roles">
                <p>Roles workspace</p>
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

  it('redirects users without the required permission to the workspace', () => {
    renderUsersRoute(createContextValue(tenantUser()));

    expect(screen.getByText('Workspace')).toBeTruthy();
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

    expect(screen.getByText('Workspace')).toBeTruthy();
    expect(screen.queryByText('Users workspace')).toBeNull();
  });

  it('returns to the workspace when authorization is unavailable', () => {
    const user = tenantUser({ [departmentId]: ['users.view'] });
    renderUsersRoute(createContextValue(user, 'unavailable'));

    expect(screen.getByText('Workspace')).toBeTruthy();
    expect(screen.queryByText('Users workspace')).toBeNull();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });

  it('protects role-management navigation with organization-scoped roles.view', () => {
    const user = tenantUser();
    renderRolesRoute(
      createContextValue({
        ...user,
        authorization: {
          ...user.authorization,
          organizationPermissions: ['roles.view'],
        },
      }),
    );

    expect(screen.getByText('Roles workspace')).toBeTruthy();
  });

  it('does not expose role-management navigation without roles.view', () => {
    renderRolesRoute(createContextValue(tenantUser()));

    expect(screen.getByText('Workspace')).toBeTruthy();
    expect(screen.queryByText('Roles workspace')).toBeNull();
  });
});

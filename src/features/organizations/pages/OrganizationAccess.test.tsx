import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenPage } from '@/app/pages/ForbiddenPage';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { AuthorizationRoute } from '@/routes/AuthorizationRoute';

function createUser(platformRole: AuthenticatedUser['platformRole']): AuthenticatedUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole,
    organizationId: platformRole ? null : '507f1f77bcf86cd799439011',
    authorization: {
      platformPermissions: [],
      organizationPermissions: ['dashboard.view'],
      departmentPermissions: {},
    },
  };
}

function renderOrganizationRoute(user: AuthenticatedUser) {
  const context: AuthContextValue = {
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

  return render(
    <AuthContext.Provider value={context}>
      <MemoryRouter initialEntries={['/organizations/507f1f77bcf86cd799439011/edit']}>
        <Routes>
          <Route
            path="/organizations/:organizationId/edit"
            element={
              <AuthorizationRoute itemId="organizations">
                <p>Organization edit route</p>
              </AuthorizationRoute>
            }
          />
          <Route path="/403" element={<ForbiddenPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('organization route authorization', () => {
  it('allows the platform session required by the backend organization routes', () => {
    renderOrganizationRoute(createUser('SUPER_ADMIN'));

    expect(screen.getByText('Organization edit route')).toBeTruthy();
  });

  it('blocks tenant users from organization management direct URLs', () => {
    renderOrganizationRoute(createUser(null));

    expect(screen.getByText('Access not available')).toBeTruthy();
    expect(screen.queryByText('Organization edit route')).toBeNull();
  });
});

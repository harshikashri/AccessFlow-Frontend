import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { WorkspaceLayout } from '@/layouts/WorkspaceLayout';

const user: AuthenticatedUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'user@example.com',
  platformRole: null,
  organizationId: 'org-1',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['dashboard.view', 'users.view'],
    departmentPermissions: {},
  },
};

function createContextValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
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
    ...overrides,
  };
}

function renderWorkspace(value = createContextValue()) {
  return render(
    <ToastProvider>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<WorkspaceLayout />}>
              <Route index element={<p>Dashboard content</p>} />
              <Route path="users" element={<p>Users content</p>} />
              <Route path="profile" element={<p>Profile content</p>} />
            </Route>
            <Route path="/login" element={<p>Sign in page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </ToastProvider>,
  );
}

describe('WorkspaceLayout', () => {
  it('renders scoped navigation, breadcrumbs, notifications, and profile actions', async () => {
    renderWorkspace();

    expect(screen.getByText('Dashboard content')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Users' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain(
      'Dashboard',
    );
    expect(screen.getByText('Test User')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Notifications', { selector: 'summary' }));
    expect(screen.getByText('Notifications are not available yet.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Test User/ }));
    expect(await screen.findByRole('menu', { name: 'Account menu' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'My profile' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Account settings' })).toBeTruthy();
  });

  it('supports collapsing the sidebar and closing the mobile drawer with Escape or navigation', () => {
    renderWorkspace();

    const sidebar = screen.getByRole('complementary', { name: 'Primary navigation' });
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(sidebar.getAttribute('data-collapsed')).toBe('true');

    const menuButton = screen.getByRole('button', { name: 'Open navigation menu' });
    fireEvent.click(menuButton);
    expect(sidebar.getAttribute('data-open')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(sidebar.getAttribute('data-open')).toBe('false');
    expect(document.activeElement).toBe(menuButton);

    fireEvent.click(menuButton);
    fireEvent.click(screen.getByRole('link', { name: 'Users' }));
    expect(screen.getByText('Users content')).toBeTruthy();
    expect(sidebar.getAttribute('data-open')).toBe('false');
  });

  it('routes profile-menu navigation and logout actions', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWorkspace(createContextValue({ logout }));

    fireEvent.click(screen.getByRole('button', { name: /Test User/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'My profile' }));
    expect(screen.getByText('Profile content')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain(
      'My profile',
    );

    fireEvent.click(screen.getByRole('button', { name: /Test User/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByText('Sign in page')).toBeTruthy());
    expect(logout).toHaveBeenCalledOnce();
  });

  it('hides the shell and exposes explicit retry and sign-out actions when access is unavailable', async () => {
    const refreshCurrentUser = vi.fn().mockRejectedValue(new Error('Profile unavailable'));
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWorkspace(
      createContextValue({
        authorizationStatus: 'unavailable',
        error: 'Authorization could not be verified.',
        refreshCurrentUser,
        logout,
      }),
    );

    expect(screen.getByText('Access could not be verified')).toBeTruthy();
    expect(screen.queryByRole('complementary', { name: 'Primary navigation' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(within(screen.getByRole('main')).getByText('Profile unavailable')).toBeTruthy(),
    );
    expect(refreshCurrentUser).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByText('Sign in page')).toBeTruthy());
    expect(logout).toHaveBeenCalledOnce();
  });
});

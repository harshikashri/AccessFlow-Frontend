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

const platformUser: AuthenticatedUser = {
  ...user,
  platformRole: 'SUPER_ADMIN',
  organizationId: null,
  authorization: {
    platformPermissions: [],
    organizationPermissions: [],
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

function renderWorkspace(value = createContextValue(), initialEntry = '/') {
  return render(
    <ToastProvider>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/" element={<WorkspaceLayout />}>
              <Route index element={<p>Dashboard content</p>} />
              <Route path="users" element={<p>Users content</p>} />
              <Route path="requests/:requestId" element={<p>Request details content</p>} />
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
    const sidebar = screen.getByRole('complementary', { name: 'Primary navigation' });
    expect(within(sidebar).queryByRole('link', { name: 'Account settings' })).toBeNull();
    expect(within(sidebar).queryByRole('link', { name: 'Add a user' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain(
      'Dashboard',
    );
    expect(screen.getByRole('button', { name: 'Open profile menu' })).toBeTruthy();
    expect(screen.queryByText(user.name)).toBeNull();
    expect(screen.queryByText(user.email)).toBeNull();

    fireEvent.click(screen.getByLabelText('Notifications', { selector: 'summary' }));
    expect(screen.getByText('Notifications are not available yet.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    expect(await screen.findByRole('menu', { name: 'Account menu' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'My profile' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Account settings' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeTruthy();
  });

  it('signs out from the profile menu', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWorkspace(createContextValue({ logout }));

    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }));

    await waitFor(() => expect(screen.getByText('Sign in page')).toBeTruthy());
    expect(logout).toHaveBeenCalledOnce();
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

  it('expands and collapses dashboard submenu links from its disclosure button', () => {
    renderWorkspace();

    expect(screen.queryByRole('link', { name: 'User statistics' })).toBeNull();
    const expandButton = screen.getByRole('button', { name: 'Expand Dashboard submenu' });
    expect(expandButton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(expandButton);

    expect(screen.getByRole('link', { name: 'User statistics' })).toBeTruthy();
    const collapseButton = screen.getByRole('button', { name: 'Collapse Dashboard submenu' });
    expect(collapseButton.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(collapseButton);
    expect(screen.queryByRole('link', { name: 'User statistics' })).toBeNull();
  });

  it('shows expandable My requests and Requests categories beneath Request center', () => {
    const requestUser: AuthenticatedUser = {
      ...user,
      authorization: {
        ...user.authorization,
        organizationPermissions: [
          'dashboard.view',
          'requests.view',
          'requests.create',
          'requests.approve',
        ],
      },
    };
    renderWorkspace(createContextValue({ user: requestUser }));

    const sidebar = screen.getByRole('complementary', { name: 'Primary navigation' });
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Expand Request center submenu' }));

    const myRequestsToggle = within(sidebar).getByRole('button', {
      name: 'Expand My requests submenu',
    });
    const requestsToggle = within(sidebar).getByRole('button', {
      name: 'Expand Requests submenu',
    });
    fireEvent.click(myRequestsToggle);
    expect(within(sidebar).getByRole('link', { name: 'My requests' })).toBeTruthy();
    expect(within(sidebar).getByRole('link', { name: 'New request' })).toBeTruthy();

    fireEvent.click(requestsToggle);
    expect(within(sidebar).getByRole('link', { name: 'Requests' })).toBeTruthy();
    expect(within(sidebar).getByRole('link', { name: 'Approvals' })).toBeTruthy();
    expect(within(sidebar).getByRole('link', { name: 'Delegations' })).toBeTruthy();
  });

  it('uses a request-detail breadcrumb instead of the not-found fallback', () => {
    const departmentMember: AuthenticatedUser = {
      ...user,
      authorization: {
        platformPermissions: [],
        organizationPermissions: [],
        departmentPermissions: {
          '64b000000000000000000003': ['requests.view', 'requests.create', 'users.view'],
        },
        roleTypes: ['EMPLOYEE'],
      },
    };
    renderWorkspace(createContextValue({ user: departmentMember }), '/requests/request-1');

    expect(screen.getByText('Request details content')).toBeTruthy();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumb.textContent).toContain('Requests');
    expect(breadcrumb.textContent).toContain('Request details');
    expect(breadcrumb.textContent).not.toContain('Page not found');
  });

  it('routes profile-menu navigation and signs out through the sidebar menu', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWorkspace(createContextValue({ logout }));

    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'My profile' }));
    expect(screen.getByText('Profile content')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain(
      'My profile',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out options' }));
    fireEvent.click(
      within(screen.getByRole('menu', { name: 'Sign out options' })).getByRole('menuitem', {
        name: 'Log out',
      }),
    );
    await waitFor(() => expect(screen.getByText('Sign in page')).toBeTruthy());
    expect(logout).toHaveBeenCalledOnce();
  });

  it('logs out all devices for Organization Admins from the sidebar menu', async () => {
    const logoutAll = vi.fn().mockResolvedValue(2);
    renderWorkspace(createContextValue({ logoutAll }));

    const trigger = screen.getByRole('button', { name: 'Sign out options' });
    const actions = trigger.parentElement;
    if (!actions) throw new Error('Expected the sidebar sign-out menu wrapper');
    fireEvent.mouseEnter(actions);

    expect(await screen.findByRole('menuitem', { name: 'Log out' })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Log out of all devices' }));

    await waitFor(() => expect(screen.getByText('Sign in page')).toBeTruthy());
    expect(logoutAll).toHaveBeenCalledOnce();
  });

  it('shows the Super Admin sign-out menu on hover and signs out the current device', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderWorkspace(createContextValue({ user: platformUser, logout }));

    const trigger = screen.getByRole('button', { name: 'Sign out options' });
    const actions = trigger.parentElement;
    if (!actions) throw new Error('Expected the sidebar sign-out menu wrapper');
    fireEvent.mouseEnter(actions);

    expect(await screen.findByRole('menu', { name: 'Sign out options' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Log out of all devices' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await screen.findByRole('menu', { name: 'Account menu' });
    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).toBeNull();

    fireEvent.click(
      within(screen.getByRole('menu', { name: 'Sign out options' })).getByRole('menuitem', {
        name: 'Log out',
      }),
    );
    await waitFor(() => expect(screen.getByText('Sign in page')).toBeTruthy());
    expect(logout).toHaveBeenCalledOnce();
  });

  it('logs out all devices from the Super Admin sidebar menu', async () => {
    const logoutAll = vi.fn().mockResolvedValue(3);
    renderWorkspace(createContextValue({ user: platformUser, logoutAll }));

    const trigger = screen.getByRole('button', { name: 'Sign out options' });
    const actions = trigger.parentElement;
    if (!actions) throw new Error('Expected the sidebar sign-out menu wrapper');
    fireEvent.mouseEnter(actions);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Log out of all devices' }));

    await waitFor(() => expect(screen.getByText('Sign in page')).toBeTruthy());
    expect(logoutAll).toHaveBeenCalledOnce();
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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { OrganizationCreatePage } from '@/features/organizations/pages/OrganizationCreatePage';
import { OrganizationDetailsPage } from '@/features/organizations/pages/OrganizationDetailsPage';
import { OrganizationEditPage } from '@/features/organizations/pages/OrganizationEditPage';
import type { OrganizationDetails } from '@/features/organizations/types/organization.types';

const serviceMocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setStatus: vi.fn(),
  forgotPassword: vi.fn(),
}));

vi.mock('@/features/organizations/services/organization.service', () => ({
  organizationService: {
    list: serviceMocks.list,
    get: serviceMocks.get,
    create: serviceMocks.create,
    update: serviceMocks.update,
    setStatus: serviceMocks.setStatus,
  },
}));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    forgotPassword: serviceMocks.forgotPassword,
  },
}));

const organization = {
  id: '507f1f77bcf86cd799439011',
  name: 'Acme Corporation',
  status: 'ACTIVE' as const,
  createdBy: '507f1f77bcf86cd799439012',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

const organizationDetails: OrganizationDetails = {
  organization,
  summary: { memberCount: 12, activeMemberCount: 10, departmentCount: 3 },
};

const createResult = {
  organization,
  admin: {
    id: '507f1f77bcf86cd799439013',
    name: 'Jane Admin',
    email: 'jane@example.com',
    accountStatus: 'ACTIVE' as const,
    platformRole: null,
    organizationId: organization.id,
  },
  role: { id: '507f1f77bcf86cd799439014', name: 'Organization Admin' },
};

function platformUser(): AuthenticatedUser {
  return {
    id: 'platform-user',
    name: 'Platform Admin',
    email: 'admin@example.com',
    platformRole: 'SUPER_ADMIN',
    organizationId: null,
    authorization: {
      platformPermissions: [],
      organizationPermissions: [],
      departmentPermissions: {},
    },
  };
}

function authContext(user: AuthenticatedUser): AuthContextValue {
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

function renderRoutes(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider value={authContext(platformUser())}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/organizations/new" element={<OrganizationCreatePage />} />
              <Route
                path="/organizations/:organizationId/edit"
                element={<OrganizationEditPage />}
              />
              <Route
                path="/organizations/:organizationId"
                element={<p>Organization details route</p>}
              />
              <Route path="/403" element={<p>Forbidden</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.values(serviceMocks).forEach((mock) => mock.mockReset());
});

describe('organization create, edit, and details flows', () => {
  it('validates required creation fields and navigates to the created organization', async () => {
    const user = userEvent.setup();
    serviceMocks.create.mockResolvedValue(createResult);
    serviceMocks.forgotPassword.mockResolvedValue('Password instructions requested');
    renderRoutes('/organizations/new');

    await user.click(screen.getByRole('button', { name: 'Create organization' }));
    expect(
      screen.getByText('Organization name must be between 2 and 200 characters.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Initial admin name must be between 2 and 200 characters.'),
    ).toBeTruthy();
    expect(serviceMocks.create).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText('Organization name', { exact: false }),
      'Acme Corporation',
    );
    await user.type(screen.getByLabelText('Administrator name', { exact: false }), 'Jane Admin');
    await user.type(
      screen.getByLabelText('Administrator email', { exact: false }),
      'JANE@example.com',
    );
    await user.type(screen.getByLabelText('Temporary password', { exact: false }), 'StrongPass!1');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    expect(await screen.findByText('Organization details route')).toBeTruthy();
    expect(serviceMocks.create).toHaveBeenCalledWith({
      name: 'Acme Corporation',
      admin: {
        name: 'Jane Admin',
        email: 'jane@example.com',
        password: 'StrongPass!1',
      },
    });
    expect(serviceMocks.forgotPassword).toHaveBeenCalledWith('jane@example.com');
  });

  it('prepopulates and saves only the supported organization name field', async () => {
    const user = userEvent.setup();
    serviceMocks.get.mockResolvedValue(organizationDetails);
    serviceMocks.update.mockResolvedValue({ ...organization, name: 'Acme Group' });
    renderRoutes(`/organizations/${organization.id}/edit`);

    const nameInput = await screen.findByLabelText('Organization name', { exact: false });
    expect((nameInput as HTMLInputElement).value).toBe('Acme Corporation');
    await user.clear(nameInput);
    await user.type(nameInput, 'Acme Group');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Organization details route')).toBeTruthy();
    expect(serviceMocks.update).toHaveBeenCalledWith(organization.id, { name: 'Acme Group' });
  });

  it('shows backend summary counts and confirms status changes', async () => {
    const user = userEvent.setup();
    const inactiveDetails: OrganizationDetails = {
      ...organizationDetails,
      organization: { ...organization, status: 'INACTIVE' },
    };
    serviceMocks.get.mockResolvedValueOnce(organizationDetails).mockResolvedValue(inactiveDetails);
    serviceMocks.setStatus.mockResolvedValue(inactiveDetails.organization);
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        <ToastProvider>
          <AuthContext.Provider value={authContext(platformUser())}>
            <MemoryRouter initialEntries={[`/organizations/${organization.id}`]}>
              <Routes>
                <Route
                  path="/organizations/:organizationId"
                  element={<OrganizationDetailsPage />}
                />
              </Routes>
            </MemoryRouter>
          </AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Total members')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText(/activity history are not exposed/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Organization members will not be able to sign in/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Confirm deactivate' }));

    await waitFor(() =>
      expect(serviceMocks.setStatus).toHaveBeenCalledWith(organization.id, 'INACTIVE'),
    );
    expect(await screen.findByText('INACTIVE')).toBeTruthy();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { OrganizationListPage } from '@/features/organizations/pages/OrganizationListPage';
import type {
  OrganizationListParams,
  OrganizationListResponse,
} from '@/features/organizations/types/organization.types';

const serviceMocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setStatus: vi.fn(),
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

const organization = {
  id: '507f1f77bcf86cd799439011',
  name: 'Acme Corporation',
  status: 'ACTIVE' as const,
  createdBy: '507f1f77bcf86cd799439012',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

function listResponse(page: number): OrganizationListResponse {
  return {
    items: [organization],
    pagination: {
      page,
      limit: 10,
      total: 11,
      totalPages: 2,
      hasNextPage: page === 1,
      hasPreviousPage: page > 1,
    },
  };
}

function summaryResponse(total: number): OrganizationListResponse {
  return {
    items: [],
    pagination: {
      page: 1,
      limit: 1,
      total,
      totalPages: total,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

function createUser(platformRole: AuthenticatedUser['platformRole']): AuthenticatedUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole,
    organizationId: platformRole ? null : 'org-1',
    authorization: {
      platformPermissions: [],
      organizationPermissions: ['dashboard.view'],
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

function renderList(user: AuthenticatedUser) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContext(user)}>
        <MemoryRouter initialEntries={['/organizations']}>
          <Routes>
            <Route path="/organizations" element={<OrganizationListPage />} />
            <Route path="/403" element={<p>Forbidden</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.values(serviceMocks).forEach((mock) => mock.mockReset());
  serviceMocks.list.mockImplementation((params: OrganizationListParams) => {
    if (params.limit === 1) {
      return Promise.resolve(
        summaryResponse(params.status === 'ACTIVE' ? 2 : params.status === 'INACTIVE' ? 1 : 3),
      );
    }
    return Promise.resolve(listResponse(params.page));
  });
});

describe('OrganizationListPage', () => {
  it('renders platform analytics and paginated organization data with backend filters', async () => {
    const user = userEvent.setup();
    renderList(createUser('SUPER_ADMIN'));

    expect(await screen.findByText('Acme Corporation')).toBeTruthy();
    expect(screen.getByText('Total organizations')).toBeTruthy();
    expect(screen.getByText('Active organizations')).toBeTruthy();
    expect(screen.getByText('Inactive organizations')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Acme Corporation' }).getAttribute('href')).toBe(
      `/organizations/${organization.id}`,
    );
    expect(screen.getByRole('link', { name: 'Edit Acme Corporation' }).getAttribute('href')).toBe(
      `/organizations/${organization.id}/edit`,
    );
    expect(screen.queryByText(/ID:/)).toBeNull();

    await user.type(screen.getByLabelText('Search organizations'), 'Acme');
    await waitFor(() =>
      expect(serviceMocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Acme', page: 1 }),
        expect.any(AbortSignal),
      ),
    );

    await user.selectOptions(screen.getByLabelText('Status'), 'ACTIVE');
    await waitFor(() =>
      expect(serviceMocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'ACTIVE', page: 1 }),
        expect.any(AbortSignal),
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(serviceMocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'ACTIVE', search: 'Acme', page: 2 }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('shows an explicit empty state and keeps organization controls unavailable to tenant users', async () => {
    serviceMocks.list.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    const { rerender } = renderList(createUser('SUPER_ADMIN'));
    expect(await screen.findByText('No organizations yet.')).toBeTruthy();
    const callsBeforeUnauthorizedRender = serviceMocks.list.mock.calls.length;

    rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        <AuthContext.Provider value={authContext(createUser(null))}>
          <MemoryRouter initialEntries={['/organizations']}>
            <Routes>
              <Route path="/organizations" element={<OrganizationListPage />} />
              <Route path="/403" element={<p>Forbidden</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Forbidden')).toBeTruthy();
    expect(serviceMocks.list).toHaveBeenCalledTimes(callsBeforeUnauthorizedRender);
  });

  it('shows a list error and retries the failed request', async () => {
    const user = userEvent.setup();
    let listAttempts = 0;
    serviceMocks.list.mockImplementation((params: OrganizationListParams) => {
      if (params.limit === 1) return Promise.resolve(summaryResponse(3));
      listAttempts += 1;
      return listAttempts === 1
        ? Promise.reject(new Error('Network unavailable'))
        : Promise.resolve(listResponse(params.page));
    });

    renderList(createUser('SUPER_ADMIN'));
    expect(await screen.findByText('Organizations could not be loaded')).toBeTruthy();
    expect(screen.getByText('Network unavailable')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Acme Corporation')).toBeTruthy();
    expect(listAttempts).toBe(2);
  });
});

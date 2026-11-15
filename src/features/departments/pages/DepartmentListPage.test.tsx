import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { DepartmentListPage } from '@/features/departments/pages/DepartmentListPage';
import type {
  DepartmentListParams,
  DepartmentListResponse,
} from '@/features/departments/types/department.types';

const departmentId = '64b000000000000000000001';
const organizationId = '64b000000000000000000002';
const department = {
  id: departmentId,
  organizationId,
  name: 'Engineering',
  description: '',
  status: 'ACTIVE' as const,
  managerCount: 1,
  memberCount: 4,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
};

const serviceMocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setStatus: vi.fn(),
  replaceManagers: vi.fn(),
  listManagerCandidates: vi.fn(),
}));

vi.mock('@/features/departments/services/department.service', () => ({
  departmentService: serviceMocks,
}));

function listResponse(page: number): DepartmentListResponse {
  return {
    items: [department],
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

function tenantUser(
  organizationPermissions: AuthenticatedUser['authorization']['organizationPermissions'],
  departmentPermissions: AuthenticatedUser['authorization']['departmentPermissions'] = {},
): AuthenticatedUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole: null,
    organizationId,
    authorization: {
      platformPermissions: [],
      organizationPermissions,
      departmentPermissions,
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
        <MemoryRouter initialEntries={['/departments']}>
          <Routes>
            <Route path="/departments" element={<DepartmentListPage />} />
            <Route path="/403" element={<p>Forbidden</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.values(serviceMocks).forEach((mock) => mock.mockReset());
  serviceMocks.list.mockImplementation((params: DepartmentListParams) =>
    Promise.resolve(listResponse(params.page)),
  );
});

describe('DepartmentListPage', () => {
  it('uses server-side search, status, sorting, and pagination', async () => {
    const user = userEvent.setup();
    renderList(tenantUser(['departments.view', 'departments.create']));

    expect(await screen.findByText('Engineering')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create department' })).toBeTruthy();

    await user.type(screen.getByLabelText('Search departments'), 'Engineering');
    await waitFor(() =>
      expect(serviceMocks.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Engineering', page: 1 }),
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
        expect.objectContaining({ search: 'Engineering', status: 'ACTIVE', page: 2 }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('hides create controls for a department-scoped role and retries failed requests', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    serviceMocks.list.mockImplementation(() => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error('Network unavailable'))
        : Promise.resolve(listResponse(1));
    });

    renderList(tenantUser([], { [departmentId]: ['departments.view'] }));

    expect(await screen.findByText('Departments could not be loaded')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create department' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Engineering')).toBeTruthy();
    expect(attempts).toBe(2);
  });

  it('forbids platform sessions instead of attempting tenant department APIs', async () => {
    const platformUser = tenantUser([], {});
    platformUser.platformRole = 'SUPER_ADMIN';
    platformUser.organizationId = null;
    renderList(platformUser);

    expect(await screen.findByText('Forbidden')).toBeTruthy();
    expect(serviceMocks.list).not.toHaveBeenCalled();
  });
});

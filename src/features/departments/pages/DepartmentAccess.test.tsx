import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { DepartmentDetailsPage } from '@/features/departments/pages/DepartmentDetailsPage';
import type { DepartmentDetails } from '@/features/departments/types/department.types';

const departmentId = '64b000000000000000000001';
const otherDepartmentId = '64b000000000000000000009';
const organizationId = '64b000000000000000000002';
const details: DepartmentDetails = {
  department: {
    id: departmentId,
    organizationId,
    name: 'Engineering',
    description: '',
    status: 'ACTIVE',
    managerCount: 0,
    memberCount: 0,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-02T10:00:00.000Z',
  },
  managers: [],
  members: [],
  summary: { managerCount: 0, memberCount: 0 },
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

function createUser(
  permissions: AuthenticatedUser['authorization']['organizationPermissions'],
  departmentPermissions: AuthenticatedUser['authorization']['departmentPermissions'],
  platformRole: AuthenticatedUser['platformRole'] = null,
): AuthenticatedUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole,
    organizationId: platformRole ? null : organizationId,
    authorization: {
      platformPermissions: [],
      organizationPermissions: permissions,
      departmentPermissions,
    },
  };
}

function renderDetails(user: AuthenticatedUser, requestedId = departmentId) {
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
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ToastProvider>
        <AuthContext.Provider value={context}>
          <MemoryRouter initialEntries={[`/departments/${requestedId}`]}>
            <Routes>
              <Route path="/departments/:departmentId" element={<DepartmentDetailsPage />} />
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
  serviceMocks.get.mockResolvedValue(details);
});

describe('DepartmentDetailsPage authorization', () => {
  it('shows an invalid-link message without requesting department data', async () => {
    renderDetails(createUser(['departments.view'], {}), 'not-a-department-id');

    expect(await screen.findByText('The department ID in this address is not valid.')).toBeTruthy();
    expect(serviceMocks.get).not.toHaveBeenCalled();
  });

  it.each([
    ['a platform session', createUser([], {}, 'SUPER_ADMIN')],
    [
      'a department member without department view',
      createUser([], { [departmentId]: ['users.view'] }),
    ],
    [
      'a custom role scoped to a different department',
      createUser([], { [otherDepartmentId]: ['departments.view', 'departments.edit'] }),
    ],
  ])('blocks direct detail navigation for %s before requesting data', async (_label, user) => {
    renderDetails(user);

    expect(await screen.findByText('Forbidden')).toBeTruthy();
    expect(serviceMocks.get).not.toHaveBeenCalled();
  });

  it('allows a department-scoped manager to view only their department without org actions', async () => {
    renderDetails(
      createUser([], {
        [departmentId]: ['departments.view', 'departments.edit'],
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Engineering' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit department' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Manage managers' })).toBeNull();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { DepartmentCreatePage } from '@/features/departments/pages/DepartmentCreatePage';
import { DepartmentDetailsPage } from '@/features/departments/pages/DepartmentDetailsPage';
import { DepartmentEditPage } from '@/features/departments/pages/DepartmentEditPage';
import type { DepartmentDetails } from '@/features/departments/types/department.types';

const departmentId = '64b000000000000000000001';
const organizationId = '64b000000000000000000002';
const managerId = '64b000000000000000000003';
const candidateId = '64b000000000000000000004';
const department = {
  id: departmentId,
  organizationId,
  name: 'Engineering',
  description: 'Product engineering',
  status: 'ACTIVE' as const,
  managerCount: 1,
  memberCount: 1,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
};
const details: DepartmentDetails = {
  department,
  managers: [
    {
      id: managerId,
      name: 'Morgan Manager',
      email: 'morgan@example.com',
      accountStatus: 'ACTIVE',
      membershipStatus: 'ACTIVE',
      membershipId: '64b000000000000000000005',
      departmentId,
    },
  ],
  members: [
    {
      id: managerId,
      name: 'Morgan Manager',
      email: 'morgan@example.com',
      accountStatus: 'ACTIVE',
      membershipStatus: 'ACTIVE',
      membershipId: '64b000000000000000000005',
      departmentId,
    },
  ],
  summary: { managerCount: 1, memberCount: 1 },
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

function renderRoutes(initialPath: string, user: AuthenticatedUser) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider value={authContext(user)}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/departments/new" element={<DepartmentCreatePage />} />
              <Route path="/departments/:departmentId/edit" element={<DepartmentEditPage />} />
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
});

describe('department creation and editing', () => {
  it('validates creation and sends only the supported fields', async () => {
    const user = userEvent.setup();
    serviceMocks.create.mockResolvedValue(department);
    serviceMocks.get.mockResolvedValue(details);
    renderRoutes('/departments/new', tenantUser(['departments.create']));

    await user.click(screen.getByRole('button', { name: 'Create department' }));
    expect(screen.getByText('Department name must be between 2 and 200 characters.')).toBeTruthy();
    expect(serviceMocks.create).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Department name', { exact: false }), 'Engineering');
    await user.type(screen.getByLabelText('Description', { exact: false }), 'Product engineering');
    await user.click(screen.getByRole('button', { name: 'Create department' }));

    expect(await screen.findByText('Engineering was created successfully.')).toBeTruthy();
    expect(screen.getByText(departmentId)).toBeTruthy();
    expect(serviceMocks.create).toHaveBeenCalledWith({
      name: 'Engineering',
      description: 'Product engineering',
    });
  });

  it('loads the edit form and submits only the changed fields', async () => {
    const user = userEvent.setup();
    serviceMocks.get.mockResolvedValue(details);
    serviceMocks.update.mockResolvedValue({ ...department, name: 'Product' });
    renderRoutes(
      `/departments/${departmentId}/edit`,
      tenantUser(['departments.view', 'departments.edit']),
    );

    const nameInput = await screen.findByLabelText('Department name', { exact: false });
    expect((nameInput as HTMLInputElement).value).toBe('Engineering');
    await user.clear(nameInput);
    await user.type(nameInput, 'Product');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('heading', { name: 'Engineering' })).toBeTruthy();
    expect(serviceMocks.update).toHaveBeenCalledWith(departmentId, { name: 'Product' });
  });

  it('does not allow department-scoped create permission to bypass organization-wide creation', async () => {
    const scopedUser = tenantUser([], {
      [departmentId]: ['departments.create'],
    });
    renderRoutes('/departments/new', scopedUser);

    expect(await screen.findByText('Forbidden')).toBeTruthy();
    expect(serviceMocks.create).not.toHaveBeenCalled();
  });
});

describe('department details actions', () => {
  it('shows backend counts and confirms status transitions', async () => {
    const user = userEvent.setup();
    serviceMocks.get.mockResolvedValue(details);
    serviceMocks.setStatus.mockResolvedValue({ ...department, status: 'INACTIVE' });
    renderRoutes(
      `/departments/${departmentId}`,
      tenantUser(['departments.view', 'departments.edit']),
    );

    expect((await screen.findAllByText('Morgan Manager')).length).toBeGreaterThan(0);
    expect(screen.getByText('Product engineering')).toBeTruthy();
    expect(screen.getByText('Active members')).toBeTruthy();
    expect(screen.getByText(/Department audit events are recorded by the backend/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Existing member and manager assignments are retained/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Confirm deactivate' }));

    expect(serviceMocks.setStatus).toHaveBeenCalledWith(departmentId, 'INACTIVE');
  });

  it('replaces the full manager list with backend-verified eligible candidates', async () => {
    const user = userEvent.setup();
    serviceMocks.get.mockResolvedValue(details);
    serviceMocks.listManagerCandidates.mockResolvedValue([
      { id: managerId, name: 'Morgan Manager', email: 'morgan@example.com' },
      { id: candidateId, name: 'Alex Candidate', email: 'alex@example.com' },
    ]);
    serviceMocks.replaceManagers.mockResolvedValue({ ...department, managerCount: 2 });
    renderRoutes(
      `/departments/${departmentId}`,
      tenantUser(['departments.view', 'departments.edit', 'roles.view', 'users.view']),
    );

    await screen.findByRole('button', { name: 'Manage managers' });
    await user.click(screen.getByRole('button', { name: 'Manage managers' }));
    expect(await screen.findByLabelText('Alex Candidate')).toBeTruthy();
    await user.click(screen.getByLabelText('Alex Candidate'));
    await user.click(screen.getByRole('button', { name: 'Save managers' }));

    expect(serviceMocks.replaceManagers).toHaveBeenCalledWith(departmentId, [
      managerId,
      candidateId,
    ]);
  });
});

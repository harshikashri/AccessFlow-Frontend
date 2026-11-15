import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { dashboardQueryKeys } from '@/features/dashboard/hooks/dashboard-query-keys';
import { departmentQueryKeys } from '@/features/departments/hooks/department-query-keys';
import { userQueryKeys } from '@/features/users/hooks/user-query-keys';
import { useBulkUserDeactivation, useUpdateUser } from '@/features/users/hooks/useUsers';
import type { UserListParams } from '@/features/users/types/user.types';

const serviceMock = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  assignDepartment: vi.fn(),
  setMembershipStatus: vi.fn(),
  sendPasswordInstructions: vi.fn(),
}));

const bulkUserServiceMock = vi.hoisted(() => ({
  downloadTemplate: vi.fn(),
  validateImport: vi.fn(),
  confirmImport: vi.fn(),
  deactivateUsers: vi.fn(),
}));

vi.mock('@/features/users/services/user.service', () => ({
  userService: serviceMock,
}));

vi.mock('@/features/users/services/bulk-user.service', () => ({
  bulkUserService: bulkUserServiceMock,
}));

vi.mock('@/features/users/services/user-role.service', () => ({
  userRoleService: {
    listActiveRoles: vi.fn(),
    listAssignments: vi.fn(),
    assign: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@/features/users/services/user-reference.service', () => ({
  userReferenceService: { listDepartments: vi.fn() },
}));

const params: UserListParams = {
  page: 1,
  limit: 10,
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

describe('user query mutations', () => {
  it('invalidates only the current tenant user, department, and dashboard data', async () => {
    const userId = 'user-1';
    const organizationId = '64b000000000000000000002';
    const otherOrganizationId = '64b000000000000000000099';
    const targetUserId = '64b000000000000000000001';
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const userListKey = userQueryKeys.list(userId, organizationId, params);
    const otherTenantUserKey = userQueryKeys.list(userId, otherOrganizationId, params);
    const departmentKey = departmentQueryKeys.user(userId, organizationId);
    const dashboardKey = dashboardQueryKeys.summary(userId, { range: 'LAST_30_DAYS' });
    queryClient.setQueryData(userListKey, { users: [] });
    queryClient.setQueryData(otherTenantUserKey, { users: [] });
    queryClient.setQueryData(departmentKey, { items: [] });
    queryClient.setQueryData(dashboardKey, { widgets: [] });
    serviceMock.update.mockResolvedValue({ id: targetUserId, name: 'Updated' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateUser(userId, organizationId, targetUserId), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Updated' });
    });

    expect(queryClient.getQueryState(userListKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherTenantUserKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(departmentKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(dashboardKey)?.isInvalidated).toBe(true);
  });

  it('invalidates the active organization user workspace after bulk deactivation', async () => {
    const userId = 'user-1';
    const organizationId = '64b000000000000000000002';
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const userListKey = userQueryKeys.list(userId, organizationId, params);
    queryClient.setQueryData(userListKey, { users: [] });
    bulkUserServiceMock.deactivateUsers.mockResolvedValue({
      summary: { requested: 1, deactivated: 1, failed: 0 },
      results: [{ userId: 'target-user', status: 'DEACTIVATED', message: 'Deactivated.' }],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useBulkUserDeactivation(userId, organizationId), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(['target-user']);
    });

    expect(queryClient.getQueryState(userListKey)?.isInvalidated).toBe(true);
    expect(bulkUserServiceMock.deactivateUsers).toHaveBeenCalledWith(['target-user']);
  });
});

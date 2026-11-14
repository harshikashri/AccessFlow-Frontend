import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { dashboardQueryKeys } from '@/features/dashboard/hooks/dashboard-query-keys';
import { departmentQueryKeys } from '@/features/departments/hooks/department-query-keys';
import { useUpdateDepartment } from '@/features/departments/hooks/useDepartments';
import type { DepartmentListParams } from '@/features/departments/types/department.types';

const serviceMock = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setStatus: vi.fn(),
  replaceManagers: vi.fn(),
  listManagerCandidates: vi.fn(),
}));

vi.mock('@/features/departments/services/department.service', () => ({
  departmentService: serviceMock,
}));

const params: DepartmentListParams = {
  page: 1,
  limit: 10,
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

describe('department query mutations', () => {
  it('invalidates only the current organization department data and dashboard after update', async () => {
    const userId = 'user-1';
    const organizationId = '64b000000000000000000002';
    const departmentId = '64b000000000000000000001';
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const listKey = departmentQueryKeys.list(userId, organizationId, params);
    const otherOrgKey = departmentQueryKeys.list(userId, '64b000000000000000000099', params);
    const dashboardKey = dashboardQueryKeys.summary(userId, { range: 'LAST_30_DAYS' });
    queryClient.setQueryData(listKey, { items: [] });
    queryClient.setQueryData(otherOrgKey, { items: [] });
    queryClient.setQueryData(dashboardKey, { widgets: [] });
    serviceMock.update.mockResolvedValue({ id: departmentId, name: 'Updated' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateDepartment(userId, organizationId, departmentId), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Updated' });
    });

    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherOrgKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(dashboardKey)?.isInvalidated).toBe(true);
  });
});

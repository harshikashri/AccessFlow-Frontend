import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userReferenceService } from '@/features/users/services/user-reference.service';
import type { Department } from '@/features/departments/types/department.types';

const departmentServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock('@/features/departments/services/department.service', () => ({
  departmentService: departmentServiceMock,
}));

const engineering: Department = {
  id: '64b000000000000000000001',
  organizationId: '64b000000000000000000002',
  name: 'Engineering',
  description: '',
  status: 'ACTIVE',
  managerCount: 0,
  memberCount: 0,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};
const finance: Department = {
  ...engineering,
  id: '64b000000000000000000003',
  name: 'Finance',
};

function listResponse(items: Department[], hasNextPage: boolean) {
  return {
    items,
    pagination: {
      page: hasNextPage ? 1 : 2,
      limit: 100,
      total: 2,
      totalPages: 2,
      hasNextPage,
      hasPreviousPage: !hasNextPage,
    },
  };
}

beforeEach(() => {
  departmentServiceMock.list.mockReset();
});

describe('userReferenceService', () => {
  it('uses the existing tenant department API to retrieve all active choices', async () => {
    departmentServiceMock.list
      .mockResolvedValueOnce(listResponse([engineering], true))
      .mockResolvedValueOnce(listResponse([finance], false));

    await expect(userReferenceService.listDepartments('ACTIVE')).resolves.toEqual([
      engineering,
      finance,
    ]);
    expect(departmentServiceMock.list).toHaveBeenNthCalledWith(1, {
      page: 1,
      limit: 100,
      search: '',
      status: 'ACTIVE',
      sortBy: 'name',
      sortOrder: 'asc',
    });
    expect(departmentServiceMock.list).toHaveBeenNthCalledWith(2, {
      page: 2,
      limit: 100,
      search: '',
      status: 'ACTIVE',
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });
});

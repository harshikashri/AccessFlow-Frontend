import { beforeEach, describe, expect, it, vi } from 'vitest';
import { departmentService } from '@/features/departments/services/department.service';
import type {
  Department,
  DepartmentDetails,
  DepartmentListParams,
} from '@/features/departments/types/department.types';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/services/api/api-client', () => ({
  apiClient: apiClientMock,
}));

const department: Department = {
  id: '64b000000000000000000001',
  organizationId: '64b000000000000000000002',
  name: 'Engineering',
  description: 'Product engineering',
  status: 'ACTIVE',
  managerCount: 1,
  memberCount: 4,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
};

function response(data: unknown) {
  return { data: { success: true, data } };
}

function pagination(total: number, page = 1) {
  return {
    page,
    limit: 100,
    total,
    totalPages: total ? Math.ceil(total / 100) : 0,
    hasNextPage: page * 100 < total,
    hasPreviousPage: page > 1,
  };
}

beforeEach(() => {
  apiClientMock.get.mockReset();
  apiClientMock.post.mockReset();
  apiClientMock.patch.mockReset();
});

describe('departmentService', () => {
  it('uses only supported listing filters and validates server pagination', async () => {
    const params: DepartmentListParams = {
      page: 2,
      limit: 10,
      search: 'Engineering',
      status: 'ACTIVE',
      sortBy: 'name',
      sortOrder: 'asc',
    };
    const result = {
      items: [department],
      pagination: {
        page: 2,
        limit: 10,
        total: 11,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    };
    apiClientMock.get.mockResolvedValue(response(result));

    await expect(departmentService.list(params)).resolves.toEqual(result);
    expect(apiClientMock.get).toHaveBeenCalledWith('/departments', {
      params: {
        page: '2',
        limit: '10',
        search: 'Engineering',
        status: 'ACTIVE',
        sortBy: 'name',
        sortOrder: 'asc',
      },
    });

    apiClientMock.get.mockResolvedValue(
      response({ ...result, pagination: { ...result.pagination, total: -1 } }),
    );
    await expect(departmentService.list(params)).rejects.toThrow(
      'The department API returned an unsupported response.',
    );
  });

  it('validates detail data and renders only the backend department fields', async () => {
    const details: DepartmentDetails = {
      department,
      managers: [
        {
          id: '64b000000000000000000003',
          name: 'Manager',
          email: 'manager@example.com',
          accountStatus: 'ACTIVE',
          membershipStatus: 'ACTIVE',
          membershipId: '64b000000000000000000004',
          departmentId: department.id,
        },
      ],
      members: [],
      summary: { managerCount: 1, memberCount: 0 },
    };
    apiClientMock.get.mockResolvedValue(response(details));

    await expect(departmentService.get(department.id)).resolves.toEqual(details);
    expect(apiClientMock.get).toHaveBeenCalledWith(`/departments/${department.id}`);
  });

  it('uses supported create, edit, status, and manager replacement contracts', async () => {
    apiClientMock.post.mockResolvedValue(response(department));
    apiClientMock.patch
      .mockResolvedValueOnce(response({ ...department, name: 'Product' }))
      .mockResolvedValueOnce(response({ ...department, status: 'INACTIVE' }))
      .mockResolvedValueOnce(response(department))
      .mockResolvedValueOnce(response({ ...department, managerCount: 2 }));

    await departmentService.create({ name: department.name, description: department.description });
    await departmentService.update(department.id, { name: 'Product' });
    await departmentService.setStatus(department.id, 'INACTIVE');
    await departmentService.setStatus(department.id, 'ACTIVE');
    await departmentService.replaceManagers(department.id, ['64b000000000000000000003']);

    expect(apiClientMock.post).toHaveBeenCalledWith('/departments', {
      name: department.name,
      description: department.description,
    });
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(1, `/departments/${department.id}`, {
      name: 'Product',
    });
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(
      2,
      `/departments/${department.id}/deactivate`,
    );
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(
      3,
      `/departments/${department.id}/activate`,
    );
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(
      4,
      `/departments/${department.id}/managers`,
      { managerIds: ['64b000000000000000000003'] },
    );
  });

  it('returns only active, eligible manager candidates from existing role and user APIs', async () => {
    const managerId = '64b000000000000000000010';
    const ineligibleId = '64b000000000000000000011';
    apiClientMock.get
      .mockResolvedValueOnce(
        response({
          items: [
            { id: 'role-manager', status: 'ACTIVE', permissions: ['departments.edit'] },
            { id: 'role-reader', status: 'ACTIVE', permissions: ['departments.view'] },
          ],
          pagination: pagination(2),
        }),
      )
      .mockResolvedValueOnce(
        response({
          users: [
            {
              id: managerId,
              name: 'Able Manager',
              email: 'able@example.com',
              accountStatus: 'ACTIVE',
              membership: { status: 'ACTIVE' },
              roleAssignments: [
                {
                  roleId: 'role-manager',
                  scopeType: 'DEPARTMENT',
                  departmentId: department.id,
                  status: 'ACTIVE',
                },
              ],
            },
            {
              id: ineligibleId,
              name: 'Other Department',
              email: 'other@example.com',
              accountStatus: 'ACTIVE',
              membership: { status: 'ACTIVE' },
              roleAssignments: [
                {
                  roleId: 'role-manager',
                  scopeType: 'DEPARTMENT',
                  departmentId: '64b000000000000000000099',
                  status: 'ACTIVE',
                },
              ],
            },
          ],
          pagination: pagination(2),
        }),
      );

    await expect(departmentService.listManagerCandidates(department.id)).resolves.toEqual([
      { id: managerId, name: 'Able Manager', email: 'able@example.com' },
    ]);
    expect(apiClientMock.get).toHaveBeenNthCalledWith(1, '/roles', {
      params: { page: '1', limit: '100', status: 'ACTIVE' },
    });
    expect(apiClientMock.get).toHaveBeenNthCalledWith(2, '/users', {
      params: {
        page: '1',
        limit: '100',
        status: 'ACTIVE',
        roleId: 'role-manager',
      },
    });
  });
});

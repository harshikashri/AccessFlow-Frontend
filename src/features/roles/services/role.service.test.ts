import { describe, expect, it, vi } from 'vitest';
import { roleService } from '@/features/roles/services/role.service';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/services/api/api-client', () => ({ apiClient: apiClientMock }));

const roleId = '64b000000000000000000040';
const role = {
  id: roleId,
  organizationId: '64b000000000000000000020',
  name: 'Project Viewer',
  description: 'Read project data.',
  roleType: 'CUSTOM',
  rolePurpose: 'GENERAL',
  assignmentScope: 'DEPARTMENT',
  assignmentScopes: ['DEPARTMENT'],
  permissions: ['users.view'],
  status: 'ACTIVE',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  createdBy: null,
  assignmentCount: 0,
};
const assignment = {
  id: '64b000000000000000000050',
  userId: '64b000000000000000000060',
  user: {
    id: '64b000000000000000000060',
    name: 'Taylor User',
    email: 'taylor@example.com',
    accountStatus: 'ACTIVE',
  },
  roleId,
  roleName: 'Project Viewer',
  scopeType: 'DEPARTMENT',
  departmentId: '64b000000000000000000070',
  departmentName: 'Engineering',
  status: 'ACTIVE',
  assignedBy: null,
  assignedAt: '2025-01-01T00:00:00.000Z',
};

describe('roleService', () => {
  it('sends supported scopes on custom role creation and supports dual-scope edits', async () => {
    apiClientMock.post.mockResolvedValueOnce({
      data: { success: true, data: role },
    });
    apiClientMock.patch.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...role,
          assignmentScope: null,
          assignmentScopes: ['ORGANIZATION', 'DEPARTMENT'],
        },
      },
    });

    await expect(
      roleService.create({
        name: role.name,
        description: role.description,
        permissions: ['users.view'],
        rolePurpose: 'GENERAL',
        assignmentScopes: ['DEPARTMENT'],
      }),
    ).resolves.toEqual(role);
    await expect(roleService.update(roleId, { assignmentScopes: ['ORGANIZATION', 'DEPARTMENT'] })).resolves.toEqual({
      ...role,
      assignmentScope: null,
      assignmentScopes: ['ORGANIZATION', 'DEPARTMENT'],
    });

    expect(apiClientMock.post).toHaveBeenCalledWith('/roles', {
      name: role.name,
      description: role.description,
      permissions: ['users.view'],
      rolePurpose: 'GENERAL',
      assignmentScopes: ['DEPARTMENT'],
    });
    expect(apiClientMock.patch).toHaveBeenCalledWith(`/roles/${roleId}`, {
      assignmentScopes: ['ORGANIZATION', 'DEPARTMENT'],
    });
  });

  it('keeps an unconfigured legacy custom role readable', async () => {
    const legacyRole = { ...role, assignmentScope: null, assignmentScopes: undefined };
    apiClientMock.get.mockResolvedValueOnce({
      data: { success: true, data: legacyRole },
    });

    await expect(roleService.get(roleId)).resolves.toEqual(legacyRole);
  });

  it('accepts the backend role-user serializer and sends supported pagination parameters', async () => {
    apiClientMock.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [assignment],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      },
    });

    await expect(roleService.listUsers(roleId, 1, 10)).resolves.toEqual({
      items: [assignment],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    expect(apiClientMock.get).toHaveBeenCalledWith(`/roles/${roleId}/users`, {
      params: { page: '1', limit: '10' },
    });
  });

  it('rejects unsupported assignment payload shapes instead of returning success-shaped data', async () => {
    apiClientMock.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [{ ...assignment, scopeType: 'GLOBAL' }],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      },
    });

    await expect(roleService.listUsers(roleId, 1, 10)).rejects.toThrow(
      'The role API returned an unsupported response.',
    );
  });
});

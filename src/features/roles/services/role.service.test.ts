import { describe, expect, it, vi } from 'vitest';
import { roleService } from '@/features/roles/services/role.service';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/services/api/api-client', () => ({ apiClient: apiClientMock }));

const roleId = '64b000000000000000000040';
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

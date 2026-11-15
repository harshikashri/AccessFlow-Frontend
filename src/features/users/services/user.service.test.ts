import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userService } from '@/features/users/services/user.service';
import { userRoleService } from '@/features/users/services/user-role.service';
import type { UserProfile } from '@/features/users/types/user.types';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/services/api/api-client', () => ({
  apiClient: apiClientMock,
}));

const userId = '64b000000000000000000001';
const roleId = '64b000000000000000000002';
const departmentId = '64b000000000000000000003';
const user: UserProfile = {
  id: userId,
  name: 'Taylor User',
  email: 'taylor@example.com',
  accountStatus: 'INACTIVE',
  membership: {
    membershipId: '64b000000000000000000004',
    organizationId: '64b000000000000000000005',
    organizationStatus: 'ACTIVE',
    departmentId,
    department: { id: departmentId, name: 'Engineering', status: 'ACTIVE' },
    status: 'ACTIVE',
  },
  roleAssignments: [],
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
  passwordSetupRequired: true,
};

function response(data: unknown) {
  return { data: { success: true, data } };
}

beforeEach(() => {
  apiClientMock.get.mockReset();
  apiClientMock.post.mockReset();
  apiClientMock.patch.mockReset();
  apiClientMock.delete.mockReset();
});

describe('userService', () => {
  it('serializes the unassigned department filter as the backend null sentinel', async () => {
    const result = {
      users: [user],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    apiClientMock.get.mockResolvedValue(response(result));

    await expect(
      userService.list({
        page: 1,
        limit: 10,
        search: '',
        departmentId: null,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    ).resolves.toEqual(result);
    expect(apiClientMock.get).toHaveBeenCalledWith('/users', {
      params: {
        page: '1',
        limit: '10',
        search: '',
        departmentId: 'null',
        sortBy: 'name',
        sortOrder: 'asc',
      },
    });
  });

  it('preserves every user returned on a server-paginated page', async () => {
    const otherUser = {
      ...user,
      id: '64b000000000000000000007',
      name: 'Morgan User',
      email: 'morgan@example.com',
      accountStatus: 'ACTIVE',
      passwordSetupRequired: false,
    };
    const responseData = {
      users: [user, otherUser],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    apiClientMock.get.mockResolvedValue(response(responseData));

    await expect(
      userService.list({
        page: 1,
        limit: 10,
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    ).resolves.toEqual(responseData);
  });

  it('forwards query cancellation to the HTTP client', async () => {
    apiClientMock.get.mockResolvedValue(
      response({
        users: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    );
    const controller = new AbortController();

    await userService.list(
      { page: 1, limit: 10, search: 'Taylor', sortBy: 'name', sortOrder: 'asc' },
      controller.signal,
    );

    expect(apiClientMock.get).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('accepts legacy users without the optional password setup flag', async () => {
    const legacyUser: UserProfile = { ...user };
    delete legacyUser.passwordSetupRequired;
    const responseData = {
      users: [legacyUser],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    apiClientMock.get.mockResolvedValue(response(responseData));

    await expect(
      userService.list({
        page: 1,
        limit: 10,
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    ).resolves.toEqual(responseData);
  });

  it('serializes account status, assigned department, role, and sorting filters', async () => {
    apiClientMock.get.mockResolvedValue(
      response({
        users: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    );

    await userService.list({
      page: 1,
      limit: 10,
      search: 'Taylor',
      status: 'INACTIVE',
      departmentId,
      roleId,
      sortBy: 'email',
      sortOrder: 'asc',
    });

    expect(apiClientMock.get).toHaveBeenCalledWith('/users', {
      params: {
        page: '1',
        limit: '10',
        search: 'Taylor',
        status: 'INACTIVE',
        departmentId,
        roleId,
        sortBy: 'email',
        sortOrder: 'asc',
      },
    });
  });

  it('uses supported create, edit, department, membership, and reset contracts', async () => {
    apiClientMock.post
      .mockResolvedValueOnce(response(user))
      .mockResolvedValueOnce({ data: { success: true, message: 'Instructions sent.' } });
    apiClientMock.patch
      .mockResolvedValueOnce(response(user))
      .mockResolvedValueOnce(response(user))
      .mockResolvedValueOnce(response(user));

    await userService.create({ name: user.name, email: user.email });
    await userService.update(userId, { name: 'Taylor Updated' });
    await userService.assignDepartment(userId, { departmentId: null });
    await userService.setMembershipStatus(userId, 'INACTIVE');
    await userService.sendPasswordInstructions(userId);

    expect(apiClientMock.post).toHaveBeenNthCalledWith(1, '/users', {
      name: user.name,
      email: user.email,
    });
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(1, `/users/${userId}`, {
      name: 'Taylor Updated',
    });
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(2, `/users/${userId}/department`, {
      departmentId: null,
    });
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(3, `/users/${userId}/deactivate`);
    expect(apiClientMock.post).toHaveBeenNthCalledWith(2, `/users/${userId}/password-reset`);
  });

  it('rejects malformed profiles and accepts the success-only reset response', async () => {
    apiClientMock.get.mockResolvedValue(response({ ...user, membership: null }));
    await expect(userService.get(userId)).rejects.toThrow(
      'The user API returned an unsupported response.',
    );

    apiClientMock.post.mockResolvedValue({ data: { success: true } });
    await expect(userService.sendPasswordInstructions(userId)).resolves.toBeUndefined();
  });
});

describe('userRoleService', () => {
  it('keeps legacy custom roles without an assignment scope in the role catalog', async () => {
    const legacyCustomRole = {
      id: roleId,
      organizationId: '64b000000000000000000005',
      name: 'Legacy Viewer',
      description: '',
      roleType: 'CUSTOM',
      rolePurpose: 'GENERAL',
      assignmentScope: null,
      permissions: ['users.view'],
      status: 'ACTIVE',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    };
    apiClientMock.get.mockResolvedValue(
      response({
        items: [legacyCustomRole],
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    );

    await expect(userRoleService.listActiveRoles()).resolves.toEqual([legacyCustomRole]);
  });

  it('accepts all backend role types, including Finance Approver', async () => {
    const role = {
      id: roleId,
      organizationId: '64b000000000000000000005',
      name: 'Finance Approver',
      description: '',
      roleType: 'FINANCE_APPROVER',
      rolePurpose: 'FINANCE_APPROVER',
      permissions: ['requests.approve'],
      status: 'ACTIVE',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    };
    apiClientMock.get.mockResolvedValue(
      response({
        items: [role],
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    );

    await expect(userRoleService.listActiveRoles()).resolves.toEqual([role]);
    expect(apiClientMock.get).toHaveBeenCalledWith('/roles', {
      params: { page: '1', limit: '100', status: 'ACTIVE' },
    });
  });

  it('uses supported role assignment and removal endpoints with scope payloads', async () => {
    const assignment = {
      id: '64b000000000000000000006',
      userId,
      roleId,
      roleName: 'Reviewer',
      scopeType: 'DEPARTMENT',
      departmentId,
      departmentName: 'Engineering',
      status: 'ACTIVE',
      assignedBy: null,
      assignedAt: '2026-01-03T10:00:00.000Z',
    };
    apiClientMock.post.mockResolvedValue(response(assignment));
    apiClientMock.delete.mockResolvedValue(
      response({ assignmentId: assignment.id, status: 'INACTIVE' }),
    );

    await expect(
      userRoleService.assign(roleId, { userId, scopeType: 'DEPARTMENT', departmentId }),
    ).resolves.toEqual(assignment);
    await expect(
      userRoleService.remove(roleId, userId, {
        scopeType: 'DEPARTMENT',
        departmentId,
      }),
    ).resolves.toEqual({ assignmentId: assignment.id, status: 'INACTIVE' });

    expect(apiClientMock.post).toHaveBeenCalledWith(`/roles/${roleId}/assign`, {
      userId,
      scopeType: 'DEPARTMENT',
      departmentId,
    });
    expect(apiClientMock.delete).toHaveBeenCalledWith(`/roles/${roleId}/assign/${userId}`, {
      data: { scopeType: 'DEPARTMENT', departmentId },
    });
  });
});

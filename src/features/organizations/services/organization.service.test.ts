import { beforeEach, describe, expect, it, vi } from 'vitest';
import { organizationService } from '@/features/organizations/services/organization.service';
import type {
  CreateOrganizationRequest,
  Organization,
  OrganizationListParams,
} from '@/features/organizations/types/organization.types';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/services/api/api-client', () => ({
  apiClient: apiClientMock,
}));

const organization: Organization = {
  id: '507f1f77bcf86cd799439011',
  name: 'Acme',
  status: 'ACTIVE',
  createdBy: '507f1f77bcf86cd799439012',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

function response(data: unknown) {
  return { data: { success: true, data } };
}

beforeEach(() => {
  apiClientMock.get.mockReset();
  apiClientMock.post.mockReset();
  apiClientMock.patch.mockReset();
});

describe('organizationService', () => {
  it('uses only supported server-side list parameters and validates pagination', async () => {
    const params: OrganizationListParams = {
      page: 2,
      limit: 10,
      search: 'Acme',
      status: 'ACTIVE',
      sortBy: 'name',
      sortOrder: 'asc',
    };
    const result = {
      items: [organization],
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

    await expect(organizationService.list(params)).resolves.toEqual(result);
    expect(apiClientMock.get).toHaveBeenCalledWith('/organizations', {
      params: {
        page: '2',
        limit: '10',
        search: 'Acme',
        status: 'ACTIVE',
        sortBy: 'name',
        sortOrder: 'asc',
      },
    });
  });

  it('validates organization detail response shapes', async () => {
    const details = {
      organization,
      summary: { memberCount: 8, activeMemberCount: 6, departmentCount: 3 },
    };
    apiClientMock.get.mockResolvedValue(response(details));

    await expect(organizationService.get(organization.id)).resolves.toEqual(details);
    expect(apiClientMock.get).toHaveBeenCalledWith(`/organizations/${organization.id}`);

    apiClientMock.get.mockResolvedValue(response({ organization, summary: { memberCount: -1 } }));
    await expect(organizationService.get(organization.id)).rejects.toThrow(
      'The organization API returned an unsupported response.',
    );
  });

  it('posts the backend-supported organization and initial-admin payload', async () => {
    const payload: CreateOrganizationRequest = {
      name: 'Acme',
      admin: { name: 'Jane Admin', email: 'jane@example.com', password: 'StrongPass!1' },
    };
    const result = {
      organization,
      admin: {
        id: '507f1f77bcf86cd799439013',
        name: 'Jane Admin',
        email: 'jane@example.com',
        accountStatus: 'ACTIVE',
        platformRole: null,
        organizationId: organization.id,
      },
      role: { id: '507f1f77bcf86cd799439014', name: 'Organization Admin' },
    };
    apiClientMock.post.mockResolvedValue(response(result));

    await expect(organizationService.create(payload)).resolves.toEqual(result);
    expect(apiClientMock.post).toHaveBeenCalledWith('/organizations', payload);
  });

  it('uses the supported update and status endpoints', async () => {
    apiClientMock.patch
      .mockResolvedValueOnce(response({ ...organization, name: 'Acme Group' }))
      .mockResolvedValueOnce(response({ ...organization, status: 'INACTIVE' }))
      .mockResolvedValueOnce(response(organization));

    await organizationService.update(organization.id, { name: 'Acme Group' });
    await organizationService.setStatus(organization.id, 'INACTIVE');
    await organizationService.setStatus(organization.id, 'ACTIVE');

    expect(apiClientMock.patch).toHaveBeenNthCalledWith(1, `/organizations/${organization.id}`, {
      name: 'Acme Group',
    });
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(
      2,
      `/organizations/${organization.id}/deactivate`,
    );
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(
      3,
      `/organizations/${organization.id}/activate`,
    );
  });
});

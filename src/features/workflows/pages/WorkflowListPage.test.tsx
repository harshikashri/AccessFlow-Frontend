import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { WorkflowListPage } from '@/features/workflows/pages/WorkflowListPage';

const mocks = vi.hoisted(() => ({
  useRequestTypes: vi.fn(),
  useWorkflowList: vi.fn(),
}));

vi.mock('@/features/requests/hooks/useRequests', () => ({
  useRequestTypes: mocks.useRequestTypes,
}));

vi.mock('@/features/workflows/hooks/useWorkflows', () => ({
  useWorkflowList: mocks.useWorkflowList,
}));

const user: AuthenticatedUser = {
  id: 'organization-admin-1',
  name: 'Organization Admin',
  email: 'admin@example.com',
  platformRole: null,
  organizationId: 'organization-1',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['workflows.view'],
    departmentPermissions: {},
  },
};

function authContext(): AuthContextValue {
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

beforeEach(() => {
  mocks.useRequestTypes.mockReset().mockReturnValue({ data: { items: [] } });
  mocks.useWorkflowList.mockReset().mockReturnValue({
    data: {
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    },
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: vi.fn(),
  });
});

describe('WorkflowListPage', () => {
  it('filters to active workflows by default', () => {
    render(
      <AuthContext.Provider value={authContext()}>
        <MemoryRouter>
          <WorkflowListPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(mocks.useWorkflowList).toHaveBeenCalledWith(
      user.id,
      user.organizationId,
      expect.objectContaining({ isActive: true }),
      true,
    );
  });
});

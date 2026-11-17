import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/context/AuthContext';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { AuditLogsPage } from './AuditLogsPage';

const auditLogServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
  listPlatform: vi.fn(),
  get: vi.fn(),
  statistics: vi.fn(),
  exportCsv: vi.fn(),
}));

const organizationServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock('../services/audit-log.service', () => ({
  auditLogService: auditLogServiceMock,
}));

vi.mock('@/features/organizations/services/organization.service', () => ({
  organizationService: organizationServiceMock,
}));

const superAdmin: AuthenticatedUser = {
  id: 'super-admin-1',
  name: 'Platform Admin',
  email: 'platform-admin@example.com',
  platformRole: 'SUPER_ADMIN',
  organizationId: null,
  authorization: {
    platformPermissions: [],
    organizationPermissions: [],
    departmentPermissions: {},
  },
};

const organizationUser: AuthenticatedUser = {
  id: 'organization-user-1',
  name: 'Organization User',
  email: 'organization-user@example.com',
  platformRole: null,
  organizationId: 'org-1',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['audit_logs.view'],
    departmentPermissions: {},
  },
};

function createAuthContext(user: AuthenticatedUser): AuthContextValue {
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

function renderAuditLogsPage(user = superAdmin) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createAuthContext(user)}>
        <MemoryRouter>
          <AuditLogsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  auditLogServiceMock.list.mockReset();
  auditLogServiceMock.listPlatform.mockReset();
  auditLogServiceMock.get.mockReset();
  auditLogServiceMock.statistics.mockReset();
  auditLogServiceMock.exportCsv.mockReset();
  organizationServiceMock.list.mockReset();
  organizationServiceMock.list.mockResolvedValue({
    items: [
      {
        id: 'org-1',
        name: 'Northstar',
        status: 'ACTIVE',
        createdBy: 'super-admin-1',
        createdAt: '2026-11-16T10:00:00.000Z',
        updatedAt: '2026-11-16T10:00:00.000Z',
      },
    ],
    pagination: {
      page: 1,
      limit: 100,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

describe('AuditLogsPage for Super Admins', () => {
  it('loads and displays Super Admin-only audit events', async () => {
    auditLogServiceMock.listPlatform.mockResolvedValue({
      items: [
        {
          id: 'event-1',
          organizationId: 'org-1',
          departmentId: null,
          actorId: 'super-admin-1',
          actorPlatformRole: 'SUPER_ADMIN',
          actor: {
            id: 'super-admin-1',
            name: 'Platform Admin',
            email: 'platform-admin@example.com',
          },
          action: 'ORGANIZATION_CREATED',
          resourceType: 'Organization',
          resourceId: 'org-1',
          organization: { id: 'org-1', name: 'Northstar' },
          department: null,
          changes: { name: 'Northstar' },
          metadata: {},
          result: null,
          status: null,
          timestamp: '2026-11-16T10:00:00.000Z',
          description: 'ORGANIZATION CREATED — Northstar',
        },
      ],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    });

    renderAuditLogsPage();

    expect(await screen.findByText('ORGANIZATION_CREATED')).toBeTruthy();
    expect(screen.getByText('ORGANIZATION CREATED — Northstar')).toBeTruthy();
    expect(screen.getByText('Platform Admin')).toBeTruthy();
    expect(screen.getByText('Organization · Northstar')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Target entity' })).toBeTruthy();
    expect(screen.queryByText('Governance')).toBeNull();
    expect(screen.getByLabelText('Action').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Organization').tagName).toBe('SELECT');
    expect(await screen.findByRole('option', { name: 'Northstar' })).toBeTruthy();
    expect(screen.queryByLabelText('Resource type')).toBeNull();
    expect(auditLogServiceMock.listPlatform).toHaveBeenCalledTimes(1);
    expect(auditLogServiceMock.list).not.toHaveBeenCalled();
    expect(auditLogServiceMock.statistics).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();
  });

  it('shows a clear empty state when no Super Admin events are returned', async () => {
    auditLogServiceMock.listPlatform.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
    });

    renderAuditLogsPage();

    expect(
      await screen.findByText('No Super Admin audit events match the current filters.'),
    ).toBeTruthy();
  });

  it('shows an error state when the Super Admin audit endpoint fails', async () => {
    auditLogServiceMock.listPlatform.mockRejectedValue(new Error('Request failed.'));

    renderAuditLogsPage();

    expect(await screen.findByText('Audit logs unavailable')).toBeTruthy();
  });

  it('sends the selected platform action without a resource-type filter', async () => {
    auditLogServiceMock.listPlatform.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
    });
    renderAuditLogsPage();
    await screen.findByText('No Super Admin audit events match the current filters.');
    fireEvent.change(screen.getByLabelText('Action'), {
      target: { value: 'ORGANIZATION_CREATED' },
    });

    await waitFor(() => {
      const calls = auditLogServiceMock.listPlatform.mock.calls;
      expect(calls.length).toBeGreaterThan(1);
      const lastCall = calls[calls.length - 1];
      if (!lastCall) throw new Error('The platform audit query was not called.');
      expect(lastCall[0]).toMatchObject({
        action: 'ORGANIZATION_CREATED',
      });
      expect(lastCall[0]).not.toHaveProperty('resourceType');
    });
  });

  it('filters platform audit events by the selected organization', async () => {
    auditLogServiceMock.listPlatform.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
    });

    renderAuditLogsPage();
    await screen.findByText('No Super Admin audit events match the current filters.');
    fireEvent.change(screen.getByLabelText('Organization'), {
      target: { value: 'org-1' },
    });

    await waitFor(() => {
      const calls = auditLogServiceMock.listPlatform.mock.calls;
      const lastCall = calls[calls.length - 1];
      if (!lastCall) throw new Error('The platform audit query was not called.');
      expect(lastCall[0]).toMatchObject({
        organizationId: 'org-1',
        page: 1,
      });
    });
  });

  it('filters organization audit logs by an action selected from the dropdown', async () => {
    auditLogServiceMock.list.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
    });
    auditLogServiceMock.statistics.mockResolvedValue({
      total: 0,
      today: 0,
      week: 0,
      byAction: [{ action: 'CUSTOM_EVENT', count: 3 }],
    });

    renderAuditLogsPage(organizationUser);

    expect(await screen.findByText('No audit events match the current filters.')).toBeTruthy();
    expect(screen.getByLabelText('Action').tagName).toBe('SELECT');
    expect(await screen.findByRole('option', { name: 'Request Submitted' })).toBeTruthy();
    expect(
      await screen.findByRole('option', { name: 'Bulk User Import Completed With Failures' }),
    ).toBeTruthy();
    expect(await screen.findByRole('option', { name: 'Custom Event' })).toBeTruthy();
    expect(screen.getByLabelText('Resource type')).toBeTruthy();
    expect(auditLogServiceMock.list).toHaveBeenCalledTimes(1);
    expect(auditLogServiceMock.listPlatform).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Action'), {
      target: { value: 'REQUEST_SUBMITTED' },
    });

    await waitFor(() => {
      const calls = auditLogServiceMock.list.mock.calls;
      const lastCall = calls[calls.length - 1];
      if (!lastCall) throw new Error('The organization audit query was not called.');
      expect(lastCall[0]).toMatchObject({ action: 'REQUEST_SUBMITTED', page: 1 });
    });
  });
});

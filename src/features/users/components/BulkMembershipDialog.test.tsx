import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BulkMembershipDialog } from '@/features/users/components/BulkMembershipDialog';
import type { BulkMembershipTargetStatus } from '@/features/users/types/bulk-user.types';
import type { UserProfile } from '@/features/users/types/user.types';

const bulkUserServiceMock = vi.hoisted(() => ({
  downloadTemplate: vi.fn(),
  validateImport: vi.fn(),
  confirmImport: vi.fn(),
  changeMembershipStatus: vi.fn(),
}));

vi.mock('@/features/users/services/bulk-user.service', () => ({
  bulkUserService: bulkUserServiceMock,
}));

const activeUsers: UserProfile[] = [
  {
    id: 'user-1',
    name: 'Taylor User',
    email: 'taylor@example.com',
    accountStatus: 'ACTIVE',
    membership: {
      membershipId: 'membership-1',
      organizationId: 'org-1',
      organizationStatus: 'ACTIVE',
      departmentId: null,
      department: null,
      status: 'ACTIVE',
    },
    roleAssignments: [],
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  },
  {
    id: 'user-2',
    name: 'Morgan User',
    email: 'morgan@example.com',
    accountStatus: 'ACTIVE',
    membership: {
      membershipId: 'membership-2',
      organizationId: 'org-1',
      organizationStatus: 'ACTIVE',
      departmentId: null,
      department: null,
      status: 'ACTIVE',
    },
    roleAssignments: [],
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  },
];

const pendingUser: UserProfile = {
  ...activeUsers[0]!,
  id: 'user-3',
  name: 'Ishaan Das',
  email: 'ishaan@example.com',
  accountStatus: 'INACTIVE',
  passwordSetupRequired: true,
  membership: {
    ...activeUsers[0]!.membership,
    membershipId: 'membership-3',
    status: 'INACTIVE',
  },
};

function renderDialog(status: BulkMembershipTargetStatus, users: UserProfile[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onComplete = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <BulkMembershipDialog
        open
        users={users}
        status={status}
        actorId="admin-1"
        organizationId="org-1"
        onOpenChange={vi.fn()}
        onComplete={onComplete}
      />
    </QueryClientProvider>,
  );
  return { onComplete };
}

describe('BulkMembershipDialog', () => {
  it('deactivates the selected active memberships and shows individual results', async () => {
    const user = userEvent.setup();
    const { onComplete } = renderDialog('INACTIVE', activeUsers);
    bulkUserServiceMock.changeMembershipStatus.mockResolvedValue({
      summary: { requested: 2, activated: 0, deactivated: 1, failed: 1 },
      results: [
        { userId: 'user-1', status: 'DEACTIVATED', message: 'Membership deactivated.' },
        {
          userId: 'user-2',
          status: 'FAILED',
          message: 'A pending approval prevents deactivation.',
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Deactivate selected' }));

    expect(await screen.findByRole('heading', { name: 'Bulk deactivation results' })).toBeTruthy();
    expect(screen.getByText(/Deactivated:\s*Membership deactivated\./)).toBeTruthy();
    expect(bulkUserServiceMock.changeMembershipStatus).toHaveBeenCalledWith(
      ['user-1', 'user-2'],
      'INACTIVE',
    );
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('reactivates setup-pending memberships without claiming their accounts are ready', async () => {
    const user = userEvent.setup();
    renderDialog('ACTIVE', [pendingUser]);
    bulkUserServiceMock.changeMembershipStatus.mockResolvedValue({
      summary: { requested: 1, activated: 1, deactivated: 0, failed: 0 },
      results: [{ userId: 'user-3', status: 'ACTIVATED', message: 'Membership reactivated.' }],
    });

    expect(
      screen.getByText(/complete setup before they can access the organization/i),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Reactivate selected' }));

    expect(await screen.findByRole('heading', { name: 'Bulk reactivation results' })).toBeTruthy();
    expect(screen.getByText(/Reactivated:\s*Membership reactivated\./)).toBeTruthy();
    expect(bulkUserServiceMock.changeMembershipStatus).toHaveBeenCalledWith(['user-3'], 'ACTIVE');
  });
});

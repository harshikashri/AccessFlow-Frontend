import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { UserTable } from '@/features/users/components/UserTable';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type { UserProfile } from '@/features/users/types/user.types';

const userId = '64b000000000000000000001';
const profile: UserProfile = {
  id: userId,
  name: 'Taylor User',
  email: 'taylor@example.com',
  accountStatus: 'INACTIVE',
  membership: {
    membershipId: '64b000000000000000000002',
    organizationId: '64b000000000000000000003',
    organizationStatus: 'ACTIVE',
    departmentId: null,
    department: null,
    status: 'ACTIVE',
  },
  roleAssignments: [],
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
  passwordSetupRequired: true,
};
const otherProfile: UserProfile = {
  ...profile,
  id: '64b000000000000000000004',
  name: 'Morgan User',
  email: 'morgan@example.com',
  accountStatus: 'ACTIVE',
  passwordSetupRequired: false,
};
const inactiveMembershipProfile: UserProfile = {
  ...otherProfile,
  id: '64b000000000000000000005',
  name: 'Jordan User',
  email: 'jordan@example.com',
  membership: {
    ...otherProfile.membership,
    membershipId: '64b000000000000000000006',
    status: 'INACTIVE',
  },
};

const actor: AuthenticatedUser = {
  id: '64b000000000000000000010',
  name: 'Organization Admin',
  email: 'admin@example.com',
  platformRole: null,
  organizationId: '64b000000000000000000020',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['users.view', 'users.deactivate'],
    departmentPermissions: {},
  },
};

describe('UserTable', () => {
  it('displays account and membership state independently with scoped actions', () => {
    const onSetMembershipStatus = vi.fn();
    render(
      <MemoryRouter>
        <UserTable
          users={[profile, otherProfile]}
          actor={actor}
          isLoading={false}
          hasFilters={false}
          canCreate={false}
          onClearFilters={vi.fn()}
          onSetMembershipStatus={onSetMembershipStatus}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Setup pending')).toBeTruthy();
    expect(screen.getAllByText('Membership active')).toHaveLength(2);
    expect(screen.getByRole('link', { name: otherProfile.name })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Taylor User' }).getAttribute('href')).toBe(
      `/users/${userId}`,
    );
    expect(screen.getAllByRole('button', { name: 'Deactivate membership' })).toHaveLength(2);
  });

  it('selects eligible active and inactive memberships on the current page', async () => {
    const user = userEvent.setup();
    const onSelectPage = vi.fn();
    render(
      <MemoryRouter>
        <UserTable
          users={[profile, otherProfile, inactiveMembershipProfile]}
          actor={actor}
          isLoading={false}
          hasFilters={false}
          canCreate={false}
          onClearFilters={vi.fn()}
          onSetMembershipStatus={vi.fn()}
          selection={{
            selectedIds: new Set<string>(),
            canSelectUser: (targetUser) => targetUser.id !== profile.id,
            onToggle: vi.fn(),
            onSelectPage,
          }}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Select all users on this page' }));

    expect(onSelectPage).toHaveBeenCalledWith(
      [otherProfile.id, inactiveMembershipProfile.id],
      true,
    );
    expect(screen.getByLabelText('Taylor User cannot be selected')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Select Morgan User' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Select Jordan User' })).toBeTruthy();
  });
});

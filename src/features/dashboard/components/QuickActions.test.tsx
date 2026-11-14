import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';

function createUser(
  organizationPermissions: AuthenticatedUser['authorization']['organizationPermissions'],
  departmentPermissions: AuthenticatedUser['authorization']['departmentPermissions'] = {},
): AuthenticatedUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@example.com',
    platformRole: null,
    organizationId: '64b000000000000000000002',
    authorization: {
      platformPermissions: [],
      organizationPermissions,
      departmentPermissions,
    },
  };
}

describe('QuickActions', () => {
  it('links authorized department creation to the dedicated form route', () => {
    render(
      <MemoryRouter>
        <QuickActions user={createUser(['departments.create'])} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Create department/ }).getAttribute('href')).toBe(
      '/departments/new',
    );
  });

  it('does not expose organization-wide creation for department-scoped grants', () => {
    render(
      <MemoryRouter>
        <QuickActions
          user={createUser([], {
            '64b000000000000000000001': ['departments.view', 'departments.create'],
          })}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /Create department/ })).toBeNull();
  });
});

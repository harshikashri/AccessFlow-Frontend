import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PermissionMatrix } from '@/features/roles/components/PermissionMatrix';
import type { PermissionCatalogModule } from '@/features/roles/types/role.types';

const userModule: PermissionCatalogModule = {
  id: 'users',
  name: 'Users',
  permissions: [
    {
      id: 'users.view',
      name: 'View users',
      description: 'View users in the organization.',
    },
  ],
};

describe('PermissionMatrix', () => {
  it('expands catalog modules when asynchronous data arrives', () => {
    const { rerender } = render(<PermissionMatrix modules={[]} value={[]} />);

    rerender(<PermissionMatrix modules={[userModule]} value={[]} />);

    expect(screen.getByRole('button', { name: 'Collapse' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(screen.getByLabelText('View users')).toBeTruthy();
  });
});

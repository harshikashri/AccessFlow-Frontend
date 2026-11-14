import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserForm } from '@/features/users/components/UserForm';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type { UserFormValues } from '@/features/users/types/user.types';

const actor: AuthenticatedUser = {
  id: '64b000000000000000000010',
  name: 'Organization Admin',
  email: 'admin@example.com',
  platformRole: null,
  organizationId: '64b000000000000000000020',
  authorization: {
    platformPermissions: [],
    organizationPermissions: ['users.create', 'users.view', 'users.edit'],
    departmentPermissions: {},
  },
};

const initialValues: UserFormValues = {
  name: 'Taylor User',
  email: 'taylor@example.com',
  departmentId: '',
  roleAssignments: [],
};

describe('UserForm', () => {
  it('validates required profile fields before sending a create request', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <UserForm
        mode="create"
        actor={actor}
        departments={[]}
        roles={[]}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('Name must be between 2 and 200 characters.')).toBeTruthy();
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('normalizes create values and keeps department and roles optional', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <UserForm
        mode="create"
        actor={actor}
        departments={[]}
        roles={[]}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/Full name/), 'Taylor User');
    await user.type(screen.getByLabelText(/Email address/), 'TAYLOR@example.com');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Taylor User',
      email: 'taylor@example.com',
    });
  });

  it('submits only changed editable profile fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <UserForm
        mode="edit"
        actor={actor}
        initialValues={initialValues}
        departments={[]}
        roles={[]}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.clear(screen.getByLabelText(/Full name/));
    await user.type(screen.getByLabelText(/Full name/), 'Taylor Updated');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Taylor Updated' });
  });
});

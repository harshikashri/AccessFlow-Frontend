import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RoleForm } from '@/features/roles/components/RoleForm';
import type { RoleFormValues } from '@/features/roles/types/role.types';

const customValues: RoleFormValues = {
  name: '',
  description: '',
  rolePurpose: 'GENERAL',
  assignmentScopes: [],
};

describe('RoleForm assignment scopes', () => {
  it('requires at least one scope and supports selecting both', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(
      <RoleForm
        initialValues={customValues}
        isBuiltIn={false}
        isSaving={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/Role name/), 'Project Viewer');
    await user.click(screen.getByRole('button', { name: 'Save role details' }));

    expect(
      await screen.findByText('Select at least one supported assignment scope for this custom role.'),
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText('Organization'));
    await user.click(screen.getByLabelText('Department'));
    await user.click(screen.getByRole('button', { name: 'Save role details' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Project Viewer',
        assignmentScopes: ['ORGANIZATION', 'DEPARTMENT'],
      }),
    );
  });

  it('shows legacy custom roles as unconfigured until their scopes are edited', () => {
    render(
      <RoleForm
        initialValues={{
          name: 'Legacy Viewer',
          description: '',
          rolePurpose: 'GENERAL',
          assignmentScopes: [],
        }}
        isBuiltIn={false}
        isLegacyCustomRoleUnconfigured
        isSaving={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn(async () => {})}
      />,
    );

    expect(
      screen.getByText(
        'This legacy custom role is unconfigured. Select at least one scope before saving.',
      ),
    ).toBeTruthy();
  });

  it('does not add assignment-scope editing to built-in roles', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(
      <RoleForm
        initialValues={{
          name: 'Employee',
          description: 'Existing details',
          rolePurpose: 'GENERAL',
          assignmentScopes: [],
        }}
        isBuiltIn
        isSaving={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText('Supported assignment scopes')).toBeNull();
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'Updated details');
    await user.click(screen.getByRole('button', { name: 'Save role details' }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DepartmentForm } from '@/features/departments/components/DepartmentForm';

describe('DepartmentForm', () => {
  it('validates required fields and trims supported values before submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DepartmentForm mode="create" isSubmitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />,
    );

    await user.click(screen.getByRole('button', { name: 'Create department' }));
    expect(screen.getByText('Department name must be between 2 and 200 characters.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Department name', { exact: false }), '  Engineering  ');
    await user.type(screen.getByLabelText('Description', { exact: false }), '  Product teams  ');
    await user.click(screen.getByRole('button', { name: 'Create department' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Engineering',
      description: 'Product teams',
    });
  });
});

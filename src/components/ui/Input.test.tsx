import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from '@/components/ui/Input';

describe('Input password visibility', () => {
  it('toggles visibility without changing the entered value', async () => {
    const user = userEvent.setup();
    render(<Input label="Password" type="password" defaultValue="example-secret" />);

    const input = screen.getByLabelText(/^Password/) as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.value).toBe('example-secret');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
    expect(input.value).toBe('example-secret');
    expect(screen.getByRole('button', { name: 'Hide password' }).getAttribute('aria-pressed')).toBe(
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input.type).toBe('password');
    expect(input.value).toBe('example-secret');
  });
});

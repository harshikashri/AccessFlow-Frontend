import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordTokenPage } from '@/features/auth/pages/PasswordTokenPage';

const authServiceMock = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  setPassword: vi.fn(),
}));

vi.mock('@/features/auth/services/auth.service', () => ({
  authService: authServiceMock,
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}

function renderResetPage() {
  return render(
    <MemoryRouter initialEntries={['/reset-password?token=one-time-token']}>
      <Routes>
        <Route
          path="/reset-password"
          element={
            <>
              <PasswordTokenPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authServiceMock.resetPassword.mockReset();
  authServiceMock.setPassword.mockReset();
});

describe('PasswordTokenPage', () => {
  it('enforces the backend password rules before sending a reset request', async () => {
    const user = userEvent.setup();
    renderResetPage();

    await user.type(screen.getByLabelText(/^New password/), 'weak');
    await user.type(screen.getByLabelText(/^Confirm new password/), 'weak');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/at least 10 characters/i);
    expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
  });

  it('sends the one-time token and clears it from the URL after success', async () => {
    const user = userEvent.setup();
    authServiceMock.resetPassword.mockResolvedValue(
      'Your password has been reset. You can now sign in.',
    );
    renderResetPage();

    await user.type(screen.getByLabelText(/^New password/), 'StrongPass!1');
    await user.type(screen.getByLabelText(/^Confirm new password/), 'StrongPass!1');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() =>
      expect(authServiceMock.resetPassword).toHaveBeenCalledWith({
        token: 'one-time-token',
        password: 'StrongPass!1',
        confirmPassword: 'StrongPass!1',
      }),
    );
    expect(
      await screen.findByText('Your password has been reset. You can now sign in.'),
    ).toBeTruthy();
    expect(screen.getByTestId('search').textContent).toBe('');
  });
});

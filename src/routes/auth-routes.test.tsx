import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicRoute } from '@/routes/PublicRoute';

function LocationState() {
  const location = useLocation();
  return <output data-testid="location-state">{JSON.stringify(location.state)}</output>;
}

describe('authentication route guards', () => {
  it('does not render a protected page while session restoration is pending', () => {
    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute isAllowed={false} isInitializing>
                <h1>Private page</h1>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Restoring your session')).toBeTruthy();
    expect(screen.queryByText('Private page')).toBeNull();
  });

  it('preserves the protected destination when redirecting to sign in', () => {
    render(
      <MemoryRouter initialEntries={['/private?tab=profile']}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute isAllowed={false}>
                <h1>Private page</h1>
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <>
                <h1>Sign in</h1>
                <LocationState />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sign in')).toBeTruthy();
    expect(screen.getByTestId('location-state').textContent).toContain('/private');
    expect(screen.getByTestId('location-state').textContent).toContain('tab=profile');
  });

  it('redirects authenticated users away from public auth pages', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute isAuthenticated>
                <h1>Sign in form</h1>
              </PublicRoute>
            }
          />
          <Route path="/" element={<h1>Workspace</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Workspace')).toBeTruthy();
    expect(screen.queryByText('Sign in form')).toBeNull();
  });
});

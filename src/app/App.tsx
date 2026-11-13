import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { appConfig } from '@/config/app.config';
import { APP_ROUTES } from '@/routes/route.constants';

export function App() {
  const { user, logout, logoutAll } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [action, setAction] = useState<'logout' | 'logout-all' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout(logOutAllSessions: boolean) {
    setError(null);
    setAction(logOutAllSessions ? 'logout-all' : 'logout');

    try {
      if (logOutAllSessions) {
        await logoutAll();
        showToast({
          title: 'All sessions ended',
          description: 'You have been signed out on all devices.',
          variant: 'success',
        });
      } else {
        await logout();
        showToast({ title: 'Signed out', variant: 'success' });
      }
      navigate(APP_ROUTES.signIn, { replace: true });
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'We could not sign you out. Please try again.'));
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="auth-home">
      <header className="auth-home__header">
        <span className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>{appConfig.name}</span>
        </span>
        <Button
          variant="outline"
          size="sm"
          loading={action === 'logout'}
          disabled={action === 'logout-all'}
          onClick={() => void handleLogout(false)}
        >
          Sign out
        </Button>
      </header>
      <main className="auth-home__main">
        <div className="auth-placeholder">
          <Card
            title={`Welcome, ${user?.name ?? 'user'}`}
            description="You’re signed in. Your workspace is ready for the next phase."
          >
            <p>
              This neutral page confirms that authentication is working. Workspace features will be
              added separately.
            </p>
            {user?.platformRole === 'SUPER_ADMIN' && (
              <p className="auth-placeholder__role">Platform administrator</p>
            )}
            {error && (
              <Alert variant="error" title="Unable to sign out">
                {error}
              </Alert>
            )}
            <div className="auth-placeholder__actions">
              <Button
                variant="destructive"
                loading={action === 'logout-all'}
                disabled={action === 'logout'}
                onClick={() => void handleLogout(true)}
              >
                Sign out all sessions
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default App;

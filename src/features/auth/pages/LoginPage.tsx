import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage, getOrganizationIds } from '@/features/auth/services/auth-errors';
import { getAuthReturnPath } from '@/features/auth/utils/auth-navigation';
import { APP_ROUTES } from '@/routes/route.constants';

export function LoginPage() {
  const { status, error: restoreError, login, restoreSession } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
        ...(organizationId ? { organizationId } : {}),
      });
      navigate(getAuthReturnPath(location.state), { replace: true });
    } catch (error) {
      const availableOrganizations = getOrganizationIds(error);
      if (availableOrganizations.length > 0) {
        setOrganizations(availableOrganizations);
        setFormError(
          'Choose an organization to continue. Only organization IDs are available here.',
        );
      } else {
        setFormError(
          getAuthErrorMessage(
            error,
            'Unable to reach the server. Check your connection and try again.',
          ),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRestore() {
    setIsRestoring(true);
    try {
      await restoreSession();
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <AuthLayout>
      <Card
        className="auth-card"
        contentClassName="auth-card__content"
        title="Welcome back"
        description="Sign in to continue to your AccessFlow workspace."
      >
        {status === 'unavailable' && (
          <Alert variant="warning" title="Session could not be restored">
            <p>{restoreError}</p>
            <Button variant="outline" size="sm" loading={isRestoring} onClick={handleRestore}>
              Retry session restore
            </Button>
          </Alert>
        )}

        {formError && (
          <Alert variant="error" title="Unable to sign in">
            {formError}
          </Alert>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Work email"
            type="email"
            name="email"
            autoComplete="username"
            placeholder="you@organization.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setOrganizationId('');
              setOrganizations([]);
              setFormError(null);
            }}
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFormError(null);
            }}
            required
          />
          {organizations.length > 0 && (
            <Select
              label="Organization"
              name="organizationId"
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              placeholder="Choose an organization ID"
              options={organizations.map((id) => ({ value: id, label: id }))}
              required
            />
          )}
          <div className="auth-form__actions">
            <Link to={APP_ROUTES.forgotPassword}>Forgot password?</Link>
          </div>
          <Button className="auth-form__submit" type="submit" loading={isSubmitting}>
            Sign in
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}

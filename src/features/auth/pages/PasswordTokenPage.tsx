import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/components/ui';
import { AuthLayout } from '@/layouts/AuthLayout';
import { authService } from '@/features/auth/services/auth.service';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import type { PasswordTokenRequest } from '@/features/auth/types/auth.types';
import { APP_ROUTES } from '@/routes/route.constants';

function isValidPassword(password: string): boolean {
  return (
    password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function PasswordTokenPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const isSetup = location.pathname === APP_ROUTES.setPassword;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isValidPassword(password)) {
      setError(
        'Use at least 10 characters with an uppercase letter, a lowercase letter, a number, and a special character.',
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    const payload: PasswordTokenRequest = { token, password, confirmPassword };
    setIsSubmitting(true);

    try {
      const successMessage = isSetup
        ? await authService.setPassword(payload)
        : await authService.resetPassword(payload);
      setMessage(successMessage);
      setPassword('');
      setConfirmPassword('');
      navigate(location.pathname, { replace: true });
    } catch (requestError) {
      setError(
        getAuthErrorMessage(
          requestError,
          'We could not update your password. The link may have expired.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <Card
        className="auth-card"
        contentClassName="auth-card__content"
        title={
          message ? 'Password updated' : isSetup ? 'Set your password' : 'Choose a new password'
        }
        {...(message
          ? {}
          : {
              description: isSetup
                ? 'Create a password to activate your account.'
                : 'Choose a new password for your account.',
            })}
      >
        {message ? (
          <>
            <Alert variant="success" title="You’re all set">
              {message}
            </Alert>
            <Link className="auth-form__submit-link" to={APP_ROUTES.signIn}>
              Continue to sign in
            </Link>
          </>
        ) : !token ? (
          <>
            <Alert variant="error" title="This link is incomplete">
              Request a new password link to continue.
            </Alert>
            <Link className="auth-form__submit-link" to={APP_ROUTES.forgotPassword}>
              Request a new link
            </Link>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="error" title="Unable to update password">
                {error}
              </Alert>
            )}
            <Input
              label="New password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              helperText="At least 10 characters, including uppercase, lowercase, a number, and a special character."
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Enter your password again"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            <Button className="auth-form__submit" type="submit" loading={isSubmitting}>
              {isSetup ? 'Set password' : 'Update password'}
            </Button>
          </form>
        )}
        {!message && (
          <p className="auth-card__back-link">
            <Link to={APP_ROUTES.signIn}>Back to sign in</Link>
          </p>
        )}
      </Card>
    </AuthLayout>
  );
}

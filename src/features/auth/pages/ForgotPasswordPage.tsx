import { useState, type FormEvent } from 'react';
import { BackLink } from '@/components/common/BackLink';
import { Alert, Button, Card, Input } from '@/components/ui';
import { AuthLayout } from '@/layouts/AuthLayout';
import { authService } from '@/features/auth/services/auth.service';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { APP_ROUTES } from '@/routes/route.constants';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    try {
      setMessage(await authService.forgotPassword(email.trim()));
    } catch (requestError) {
      setError(
        getAuthErrorMessage(
          requestError,
          'We could not submit your request. Please try again later.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <BackLink to={APP_ROUTES.signIn} label="Back to sign in" />
      <Card
        className="auth-card"
        contentClassName="auth-card__content"
        title="Reset your password"
        description="Enter your work email and, if an account exists, we’ll send password reset instructions."
      >
        {message && (
          <Alert variant="success" title="Request received">
            {message}
          </Alert>
        )}
        {error && (
          <Alert variant="error" title="Unable to submit request">
            {error}
          </Alert>
        )}
        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            label="Work email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@organization.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button className="auth-form__submit" type="submit" loading={isSubmitting}>
            Send instructions
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}

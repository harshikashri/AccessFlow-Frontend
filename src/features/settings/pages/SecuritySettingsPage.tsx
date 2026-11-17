import { useState } from 'react';
import { Alert, Button, Card } from '@/components/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { authService } from '@/features/auth/services/auth.service';
import { useAuth } from '@/features/auth/context/useAuth';
import { SettingsLayout } from '../components/SettingsLayout';

export function SecuritySettingsPage() {
  const { user } = useAuth();
  const [isRequestingPasswordReset, setIsRequestingPasswordReset] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);

  async function requestPasswordReset() {
    setPasswordResetMessage(null);
    setPasswordResetError(null);
    if (!user?.email) {
      setPasswordResetError('We could not find an email address for your account.');
      return;
    }

    setIsRequestingPasswordReset(true);
    try {
      const requestMessage = await authService.forgotPassword(user.email);
      setPasswordResetMessage(
        `${requestMessage} Account email: ${user.email}. If delivered, check your inbox and spam folder for the link.`,
      );
    } catch (requestError) {
      setPasswordResetError(
        getAuthErrorMessage(
          requestError,
          'We could not request a password reset. Please try again.',
        ),
      );
    } finally {
      setIsRequestingPasswordReset(false);
    }
  }

  return (
    <SettingsLayout>
      <PageHeader
        eyebrow="Settings"
        title="Security"
        description="Change your password using an email link. Sign-out options are available at the bottom of the sidebar."
      />
      <Card
        title="Change password"
        description="For your security, password changes are completed through a one-time link sent to your email."
      >
        {passwordResetError && (
          <Alert variant="error" title="Password reset request failed">
            {passwordResetError}
          </Alert>
        )}
        {passwordResetMessage && (
          <Alert variant="success" title="Request received">
            {passwordResetMessage}
          </Alert>
        )}
        <div className="settings-password-form__actions">
          <Button
            type="button"
            loading={isRequestingPasswordReset}
            onClick={() => void requestPasswordReset()}
          >
            Change password
          </Button>
        </div>
      </Card>
    </SettingsLayout>
  );
}

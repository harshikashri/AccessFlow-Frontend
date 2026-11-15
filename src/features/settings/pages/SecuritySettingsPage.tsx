import { useState } from 'react';
import { Alert, Button, Card, Input } from '@/components/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { useAuth } from '@/features/auth/context/useAuth';
import { SettingsLayout } from '../components/SettingsLayout';
import { useChangePassword, useRevokeSession, useSessions } from '../hooks/useSettings';

export function SecuritySettingsPage() {
  const { logoutAll } = useAuth();
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const change = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  return (
    <SettingsLayout>
      <PageHeader
        eyebrow="Settings"
        title="Security and sessions"
        description="Review active sessions and change your password without exposing session secrets."
      />
      <Card title="Change password">
        {change.isError && (
          <Alert variant="error" title="Password change failed">
            {getAuthErrorMessage(change.error, 'Try again.')}
          </Alert>
        )}
        <Input
          label="Current password"
          name="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <Input
          label="New password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <Button
          loading={change.isPending}
          disabled={!currentPassword || !password || password !== confirmPassword}
          onClick={() => void change.mutateAsync({ currentPassword, password, confirmPassword })}
        >
          Change password
        </Button>
      </Card>
      <Card
        title="Active sessions"
        description="Refresh tokens and session secrets are never displayed."
      >
        <Button variant="outline" onClick={() => void logoutAll()}>
          Log out all sessions
        </Button>
        {sessions.isError && (
          <p>{getAuthErrorMessage(sessions.error, 'Sessions could not be loaded.')}</p>
        )}
        <div className="settings-session-list">
          {sessions.data?.map((session) => (
            <div className="settings-session" key={session.id}>
              <span>
                {session.current ? 'Current session' : 'Active session'} · last used{' '}
                {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : '—'}
              </span>
              {!session.current && !session.revokedAt && (
                <Button
                  size="sm"
                  variant="outline"
                  loading={revoke.isPending}
                  onClick={() => void revoke.mutateAsync(session.id)}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </SettingsLayout>
  );
}

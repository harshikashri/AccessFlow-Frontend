import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input } from '@/components/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { useAuth } from '@/features/auth/context/useAuth';
import { SettingsLayout } from '../components/SettingsLayout';
import { useProfile, useUpdateProfile } from '../hooks/useSettings';

export function ProfileSettingsPage() {
  const { refreshCurrentUser } = useAuth();
  const query = useProfile();
  const update = useUpdateProfile();
  const [name, setName] = useState('');
  useEffect(() => {
    if (query.data) setName(query.data.name);
  }, [query.data]);
  return (
    <SettingsLayout>
      <PageHeader
        eyebrow="Settings"
        title="Profile"
        description="Update the profile fields supported by your account."
      />
      <Card title="Personal information">
        {(query.isError || update.isError) && (
          <Alert variant="error" title="Profile update failed">
            {getAuthErrorMessage(update.error || query.error, 'Try again.')}
          </Alert>
        )}
        <form
          className="settings-profile-form"
          onSubmit={(event) => {
            event.preventDefault();
            void update.mutateAsync({ name: name.trim() }).then(() => refreshCurrentUser());
          }}
        >
          <Input
            label="Full name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input label="Email" name="email" value={query.data?.email || ''} disabled />
          <div className="settings-profile-form__actions">
            <Button type="submit" loading={update.isPending} disabled={!name.trim()}>
              Save profile
            </Button>
          </div>
        </form>
      </Card>
    </SettingsLayout>
  );
}

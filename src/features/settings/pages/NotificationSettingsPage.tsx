import { useEffect, useState } from 'react';
import { Alert, Button, Card, Switch } from '@/components/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { SettingsLayout } from '../components/SettingsLayout';
import { useNotifications, useUpdateNotifications } from '../hooks/useSettings';
import type { NotificationPreferences } from '../types/settings.types';

export function NotificationSettingsPage() {
  const query = useNotifications();
  const update = useUpdateNotifications();
  const [values, setValues] = useState<NotificationPreferences | null>(null);
  useEffect(() => {
    if (query.data) setValues(query.data);
  }, [query.data]);
  return (
    <SettingsLayout>
      <PageHeader
        eyebrow="Settings"
        title="Notifications"
        description="Manage supported operational notifications. Security messages remain mandatory."
      />
      <Card title="Notification preferences">
        {update.isError && (
          <Alert variant="error" title="Could not save notifications">
            {getAuthErrorMessage(update.error, 'Try again.')}
          </Alert>
        )}
        {values &&
          Object.entries(values).map(([key, value]) => (
            <Switch
              key={key}
              label={key.replace(/([A-Z])/g, ' $1')}
              checked={value}
              onCheckedChange={(checked) => setValues({ ...values, [key]: checked })}
            />
          ))}
        <Button
          disabled={!values}
          loading={update.isPending}
          onClick={() => values && void update.mutateAsync(values)}
        >
          Save notification preferences
        </Button>
      </Card>
    </SettingsLayout>
  );
}

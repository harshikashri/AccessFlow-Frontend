import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { SettingsLayout } from '../components/SettingsLayout';
import { usePreferences, useUpdatePreferences } from '../hooks/useSettings';

export function PreferencesSettingsPage() {
  const query = usePreferences();
  const update = useUpdatePreferences();
  const [timezone, setTimezone] = useState('UTC');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');
  useEffect(() => {
    if (query.data) {
      setTimezone(query.data.timezone);
      setDateFormat(query.data.dateFormat);
      setTimeFormat(query.data.timeFormat);
    }
  }, [query.data]);
  return (
    <SettingsLayout>
      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        description="These preferences are persisted with your account."
      />
      <Card title="Display preferences">
        {update.isError && (
          <Alert variant="error" title="Could not save preferences">
            {getAuthErrorMessage(update.error, 'Try again.')}
          </Alert>
        )}
        <Input
          label="Timezone"
          name="timezone"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
        />
        <Input
          label="Date format"
          name="dateFormat"
          value={dateFormat}
          onChange={(event) => setDateFormat(event.target.value)}
        />
        <Select
          label="Time format"
          name="timeFormat"
          value={timeFormat}
          onChange={(event) => setTimeFormat(event.target.value as '12h' | '24h')}
          options={[
            { value: '24h', label: '24-hour' },
            { value: '12h', label: '12-hour' },
          ]}
        />
        <Button
          loading={update.isPending}
          onClick={() => void update.mutateAsync({ timezone, dateFormat, timeFormat })}
        >
          Save preferences
        </Button>
      </Card>
    </SettingsLayout>
  );
}

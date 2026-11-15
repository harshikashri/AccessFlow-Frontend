import { Card } from '@/components/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { SettingsLayout } from '../components/SettingsLayout';
import { useOrganizationSettings } from '../hooks/useSettings';

export function OrganizationSettingsPage() {
  const query = useOrganizationSettings();
  return (
    <SettingsLayout>
      <PageHeader
        eyebrow="Settings"
        title="Organization"
        description="Organization configuration remains governed by the existing organization-management API."
      />
      {query.isError ? (
        <Card title="Organization settings unavailable">
          <p>{getAuthErrorMessage(query.error, 'This session has no organization context.')}</p>
        </Card>
      ) : (
        <Card title="Current organization">
          <dl className="settings-detail-list">
            <div>
              <dt>Name</dt>
              <dd>{query.data?.name || 'Loading…'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{query.data?.status || '—'}</dd>
            </div>
            <div>
              <dt>Management</dt>
              <dd>{query.data?.editableThrough || '—'}</dd>
            </div>
          </dl>
        </Card>
      )}
    </SettingsLayout>
  );
}

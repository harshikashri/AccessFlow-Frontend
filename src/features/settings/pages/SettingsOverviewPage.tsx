import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { APP_ROUTES } from '@/routes/route.constants';
import { SettingsLayout } from '../components/SettingsLayout';

export function SettingsOverviewPage() {
  const cards: { title: string; description: string; path: string }[] = [
    {
      title: 'Profile',
      description: 'Update your name and review account identity.',
      path: `${APP_ROUTES.settings}/profile`,
    },
    {
      title: 'Preferences',
      description: 'Choose supported display and regional preferences.',
      path: `${APP_ROUTES.settings}/preferences`,
    },
    {
      title: 'Notifications',
      description: 'Control supported operational notification preferences.',
      path: `${APP_ROUTES.settings}/notifications`,
    },
    {
      title: 'Security',
      description: 'Change your password and review active sessions.',
      path: `${APP_ROUTES.settings}/security`,
    },
    {
      title: 'Organization',
      description: 'Review the organization context for this session.',
      path: `${APP_ROUTES.settings}/organization`,
    },
  ];
  return (
    <SettingsLayout>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your profile, preferences, notifications, and active sessions."
      />
      <div className="settings-card-grid">
        {cards.map(({ title, description, path }) => (
          <Card key={path} title={title} description={description}>
            <Link className="settings-link" to={path}>
              Open settings
            </Link>
          </Card>
        ))}
      </div>
    </SettingsLayout>
  );
}

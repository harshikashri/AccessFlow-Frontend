import { NavLink } from 'react-router-dom';
import { Card } from '@/components/ui';
import { APP_ROUTES } from '@/routes/route.constants';

const links = [
  [APP_ROUTES.settings, 'Overview'],
  [`${APP_ROUTES.settings}/profile`, 'Profile'],
  [`${APP_ROUTES.settings}/preferences`, 'Preferences'],
  [`${APP_ROUTES.settings}/notifications`, 'Notifications'],
  [`${APP_ROUTES.settings}/security`, 'Security and sessions'],
  [`${APP_ROUTES.settings}/organization`, 'Organization'],
] as const;

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-layout">
      <aside className="settings-sidebar">
        <Card title="Settings">
          <nav aria-label="Settings navigation">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === APP_ROUTES.settings}
                className={({ isActive }) =>
                  isActive ? 'settings-link settings-link--active' : 'settings-link'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </Card>
      </aside>
      <main className="settings-content">{children}</main>
    </div>
  );
}

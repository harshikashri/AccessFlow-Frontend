import { NavLink } from 'react-router-dom';
import { Card } from '@/components/ui';
import { APP_ROUTES } from '@/routes/route.constants';
import { useAuth } from '@/features/auth/context/useAuth';
import { isPlatformSession } from '@/features/authorization/navigation';

const settingsLinks = [
  [`${APP_ROUTES.settings}/profile`, 'Profile'],
  [`${APP_ROUTES.settings}/security`, 'Security'],
  [`${APP_ROUTES.settings}/organization`, 'Organization'],
] as const;

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const platformSession = isPlatformSession(user);
  const links = platformSession
    ? [
        [`${APP_ROUTES.settings}/profile`, 'Profile'],
        [`${APP_ROUTES.settings}/security`, 'Security'],
      ]
    : settingsLinks;

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

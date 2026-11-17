import { Navigate } from 'react-router-dom';
import { APP_ROUTES } from '@/routes/route.constants';

export function SettingsOverviewPage() {
  return <Navigate to={APP_ROUTES.settingsProfile} replace />;
}

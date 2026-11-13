import { PageHeader } from '@/components/common/PageHeader';
import { AppIcon } from '@/components/common/AppIcon';
import { Button } from '@/components/ui';
import type { DashboardType } from '@/features/dashboard/types/dashboard.types';

interface DashboardHeaderProps {
  type: DashboardType;
  userName: string;
  refreshing: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ type, userName, refreshing, onRefresh }: DashboardHeaderProps) {
  const platform = type === 'PLATFORM';
  return (
    <PageHeader
      eyebrow={platform ? 'Platform' : 'Workspace'}
      title={platform ? 'Platform dashboard' : 'Dashboard'}
      description={`Welcome back, ${userName}. Here is the information available to your session.`}
      actions={
        <Button
          variant="outline"
          loading={refreshing}
          leadingIcon={<AppIcon name="refresh" size={16} />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
      }
    />
  );
}

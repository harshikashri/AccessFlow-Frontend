import { AppIcon } from '@/components/common/AppIcon';
import type { AppIconName } from '@/components/common/AppIcon';
import { Card } from '@/components/ui';

interface KpiCardProps {
  title: string;
  value: string;
  icon: AppIconName;
  description?: string;
}

export function KpiCard({ title, value, icon, description }: KpiCardProps) {
  return (
    <Card className="dashboard-kpi">
      <div className="dashboard-kpi__heading">
        <span className="dashboard-kpi__icon">
          <AppIcon name={icon} size={19} />
        </span>
        <p>{title}</p>
      </div>
      <strong className="dashboard-kpi__value">{value}</strong>
      {description && <p className="dashboard-kpi__description">{description}</p>}
    </Card>
  );
}

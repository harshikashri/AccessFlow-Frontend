import { Card } from '@/components/ui';
import type { DepartmentSummary } from '@/features/departments/types/department.types';

export function DepartmentStats({ summary }: { summary: DepartmentSummary }) {
  return (
    <Card title="Department statistics" className="department-detail-card">
      <dl className="department-stat-list">
        <div>
          <dt>Assigned managers</dt>
          <dd>{new Intl.NumberFormat().format(summary.managerCount)}</dd>
        </div>
        <div>
          <dt>Active members</dt>
          <dd>{new Intl.NumberFormat().format(summary.memberCount)}</dd>
        </div>
      </dl>
    </Card>
  );
}

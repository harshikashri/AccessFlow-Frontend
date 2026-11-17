import { Card } from '@/components/ui';
import type { Department } from '@/features/departments/types/department.types';
import { formatDepartmentDate } from '@/features/departments/utils/department.utils';
import { DepartmentStatusBadge } from './DepartmentStatusBadge';

export function DepartmentOverview({ department }: { department: Department }) {
  return (
    <Card title="Department overview" className="department-detail-card">
      <dl className="department-details">
        <div>
          <dt>Status</dt>
          <dd>
            <DepartmentStatusBadge status={department.status} />
          </dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd>{department.description || 'No description provided'}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDepartmentDate(department.createdAt)}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatDepartmentDate(department.updatedAt)}</dd>
        </div>
      </dl>
    </Card>
  );
}

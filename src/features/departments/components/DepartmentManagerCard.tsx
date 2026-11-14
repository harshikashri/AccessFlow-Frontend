import { Badge, Button, Card } from '@/components/ui';
import type { DepartmentUser } from '@/features/departments/types/department.types';

interface DepartmentManagerCardProps {
  managers: DepartmentUser[];
  canManage: boolean;
  onManage: () => void;
}

export function DepartmentManagerCard({
  managers,
  canManage,
  onManage,
}: DepartmentManagerCardProps) {
  return (
    <Card
      title="Department managers"
      description="Managers are shown from the department's current manager assignments."
      className="department-detail-card"
      action={
        canManage ? (
          <Button size="sm" variant="outline" onClick={onManage}>
            Manage managers
          </Button>
        ) : undefined
      }
    >
      {managers.length === 0 ? (
        <p className="department-empty-note">No manager is currently assigned.</p>
      ) : (
        <ul className="department-manager-list">
          {managers.map((manager) => (
            <li key={manager.id}>
              <div>
                <strong>{manager.name}</strong>
                <span>{manager.email}</span>
              </div>
              <Badge variant={manager.accountStatus === 'ACTIVE' ? 'success' : 'warning'}>
                {manager.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

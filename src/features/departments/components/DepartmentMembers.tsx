import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import type { DepartmentUser } from '@/features/departments/types/department.types';

export function DepartmentMembers({ members }: { members: DepartmentUser[] }) {
  return (
    <Card
      title="Department members"
      description="Active organization accounts currently assigned to this department."
      className="department-members-card"
    >
      <Table aria-label="Department members">
        <TableHead>
          <TableRow>
            <TableHeader scope="col">Name</TableHeader>
            <TableHeader scope="col">Email</TableHeader>
            <TableHeader scope="col">Account status</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {members.length === 0 ? (
            <TableEmptyState colSpan={3}>No active members are assigned.</TableEmptyState>
          ) : (
            members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Badge variant={member.accountStatus === 'ACTIVE' ? 'success' : 'warning'}>
                    {member.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

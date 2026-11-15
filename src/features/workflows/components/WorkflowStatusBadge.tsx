import type { Workflow } from '../types/workflow.types';

export function WorkflowStatusBadge({ workflow }: { workflow: Workflow }) {
  const label = workflow.isActive ? 'Active' : 'Inactive';
  return (
    <span
      className={`workflow-status workflow-status--${workflow.isActive ? 'active' : 'inactive'}`}
    >
      {label}
    </span>
  );
}

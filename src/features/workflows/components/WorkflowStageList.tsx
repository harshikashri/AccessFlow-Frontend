import { Card } from '@/components/ui';
import type { RequestField } from '@/features/requests/types/request.types';
import type { WorkflowStage } from '../types/workflow.types';
import { formatWorkflowCondition } from './workflow-form.utils';

export function WorkflowStageList({
  stages,
  requestFields = [],
}: {
  stages: WorkflowStage[];
  requestFields?: RequestField[];
}) {
  if (!stages.length) {
    return <p className="workflow-muted">No approval stages are configured.</p>;
  }

  return (
    <ol className="workflow-stage-list">
      {stages
        .slice()
        .sort((left, right) => left.sequence - right.sequence)
        .map((stage) => (
          <li key={stage.stageId} className="workflow-stage-list__item">
            <span className="workflow-stage-list__number">{stage.sequence}</span>
            <Card className="workflow-stage-card">
              <div className="workflow-stage-card__heading">
                <div>
                  <h3>{stage.name}</h3>
                  <p>{stage.description || 'Approval stage'}</p>
                </div>
                <span className="workflow-stage-card__type">
                  {stage.approverType.replaceAll('_', ' ')}
                </span>
              </div>
              <dl className="workflow-stage-card__details">
                <div>
                  <dt>Resolution</dt>
                  <dd>{stage.assignment.resolution.replace('_', ' ')}</dd>
                </div>
                <div>
                  <dt>Approval mode</dt>
                  <dd>{stage.approvalMode}</dd>
                </div>
                <div>
                  <dt>Requirement</dt>
                  <dd>{stage.isMandatory ? 'Mandatory' : 'Conditional or optional'}</dd>
                </div>
                {stage.condition && (
                  <div>
                    <dt>Execution condition</dt>
                    <dd>{formatWorkflowCondition(stage.condition, requestFields)}</dd>
                  </div>
                )}
                {!stage.condition && (
                  <div>
                    <dt>Execution condition</dt>
                    <dd>Always applies</dd>
                  </div>
                )}
                <div>
                  <dt>Stage SLA</dt>
                  <dd>
                    {stage.sla
                      ? `${stage.sla.duration} ${stage.sla.unit.toLowerCase()}`
                      : 'Not configured'}
                  </dd>
                </div>
                {stage.assignment.roleId && (
                  <div>
                    <dt>Approval role</dt>
                    <dd>{stage.assignment.roleId}</dd>
                  </div>
                )}
                {stage.assignment.roleId && stage.assignment.scopeType && (
                  <div>
                    <dt>Eligible approvers</dt>
                    <dd>
                      {stage.assignment.scopeType === 'DEPARTMENT'
                        ? 'Role holders in the request department'
                        : stage.assignment.scopeType === 'ORGANIZATION'
                          ? 'Organization-wide role holders'
                          : 'Organization-wide or request-department role holders'}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          </li>
        ))}
    </ol>
  );
}

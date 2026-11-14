import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Modal, Spinner } from '@/components/ui';
import type {
  DepartmentManagerCandidate,
  DepartmentUser,
} from '@/features/departments/types/department.types';

interface AssignManagerDialogProps {
  open: boolean;
  departmentName: string;
  currentManagers: DepartmentUser[];
  candidates: DepartmentManagerCandidate[] | undefined;
  isLoading: boolean;
  isError: boolean;
  loadError: string | null;
  isSaving: boolean;
  saveError: string | null;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onSubmit: (managerIds: string[]) => void;
}

export function AssignManagerDialog({
  open,
  departmentName,
  currentManagers,
  candidates,
  isLoading,
  isError,
  loadError,
  isSaving,
  saveError,
  onOpenChange,
  onRetry,
  onSubmit,
}: AssignManagerDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const candidateOptions = useMemo(() => {
    const options = new Map((candidates ?? []).map((candidate) => [candidate.id, candidate]));
    for (const manager of currentManagers) {
      if (!options.has(manager.id)) {
        options.set(manager.id, {
          id: manager.id,
          name: manager.name,
          email: manager.email,
        });
      }
    }
    return [...options.values()];
  }, [candidates, currentManagers]);
  const eligibleIds = useMemo(
    () => new Set((candidates ?? []).map((candidate) => candidate.id)),
    [candidates],
  );

  useEffect(() => {
    if (open) setSelectedIds(currentManagers.map((manager) => manager.id));
  }, [currentManagers, open]);

  function toggleCandidate(candidateId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, candidateId])]
        : current.filter((id) => id !== candidateId),
    );
  }

  return (
    <Modal
      open={open}
      title="Manage department managers"
      description={`Choose the complete manager list for ${departmentName}. Only users with an active eligible departments.edit assignment can be saved.`}
      size="md"
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(selectedIds)}
            loading={isSaving}
            disabled={isSaving || isLoading || isError || selectedIds.length > 100}
          >
            Save managers
          </Button>
        </>
      }
    >
      {loadError && (
        <Alert variant="error" title="Manager candidates could not be loaded">
          <p>{loadError}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </Alert>
      )}
      {saveError && (
        <Alert variant="error" title="Manager assignments were not changed">
          {saveError}
        </Alert>
      )}
      {isLoading ? (
        <div className="department-candidates__loading">
          <Spinner label="Loading eligible manager candidates" />
        </div>
      ) : (
        !isError && (
          <>
            <p className="department-dialog__consequence">
              Saving replaces the complete manager list. The backend verifies organization
              membership, account status, role status, and permission scope before applying the
              change.
            </p>
            {candidateOptions.length === 0 ? (
              <p className="department-empty-note">No eligible manager candidates were found.</p>
            ) : (
              <>
                <p className="department-candidate-count" aria-live="polite">
                  {selectedIds.length} of 100 manager slots selected
                </p>
                <fieldset className="department-candidate-list">
                  <legend>Eligible candidates</legend>
                  {candidateOptions.map((candidate) => {
                    const eligible = eligibleIds.has(candidate.id);
                    const selected = selectedIds.includes(candidate.id);
                    return (
                      <div className="department-candidate" key={candidate.id}>
                        <Checkbox
                          label={candidate.name}
                          helperText={candidate.email}
                          checked={selected}
                          onChange={(event) => toggleCandidate(candidate.id, event.target.checked)}
                          disabled={isSaving || (!selected && selectedIds.length >= 100)}
                        />
                        {!eligible && (
                          <span className="department-candidate__note">
                            Existing assignment; no longer returned as eligible.
                          </span>
                        )}
                      </div>
                    );
                  })}
                </fieldset>
              </>
            )}
          </>
        )
      )}
    </Modal>
  );
}

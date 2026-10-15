'use client';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Badge } from '@/components/ui/badge';

import { useMemo, useState } from 'react';

import { useProjectLabels } from '@/hooks/labels/use-project-labels';
import { useTaskLabels } from '@/hooks/labels/use-task-labels';
import { useAssignLabel } from '@/hooks/labels/use-assign-label';
import { useRemoveLabel } from '@/hooks/labels/use-remove-label';
import type { TaskLabel } from '@/lib/labels';

interface TaskLabelsProps {
  taskId: number;
  projectId: number | null;
  initialLabels: TaskLabel[];
}

export function TaskLabels({
  taskId,
  projectId,
  initialLabels,
}: TaskLabelsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState('');

  const {
    data: taskLabels,
    isPending: isTaskLabelsPending,
    isError: isTaskLabelsError,
  } = useTaskLabels(taskId);

  const {
    data: projectLabels,
    isPending: isProjectLabelsPending,
    isError: isProjectLabelsError,
  } = useProjectLabels(projectId ?? 0);

  const assignLabelMutation = useAssignLabel(taskId);

  const labels = taskLabels ?? initialLabels;

  const availableLabels = useMemo(() => {
    const assignedIds = new Set(labels.map((label) => label.id));

    return projectLabels?.filter((label) => !assignedIds.has(label.id)) ?? [];
  }, [labels, projectLabels]);

  const handleAssign = async () => {
    const labelId = Number(selectedLabelId);

    if (!Number.isInteger(labelId) || labelId <= 0) {
      return;
    }

    try {
      await assignLabelMutation.mutateAsync({
        labelId,
      });

      setSelectedLabelId('');
    } catch {
      return;
    }
  };

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Labels</h2>

        {projectId && (
          <Button
            variant="ghost"
            type="button"
            onClick={() => setIsEditing((value) => !value)}
          >
            {isEditing ? 'Done' : 'Edit labels'}
          </Button>
        )}
      </div>

      {isEditing && projectId && (
        <div className="mt-3 flex flex-wrap gap-2">
          {availableLabels.length > 0 ? (
            <>
              <NativeSelect
                value={selectedLabelId}
                onChange={(event) => setSelectedLabelId(event.target.value)}
                disabled={
                  isProjectLabelsPending || assignLabelMutation.isPending
                }
                className="min-w-52"
              >
                <option value="">Select a label</option>

                {availableLabels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </NativeSelect>

              <Button
                variant="default"
                type="button"
                onClick={() => void handleAssign()}
                disabled={!selectedLabelId || assignLabelMutation.isPending}
              >
                {assignLabelMutation.isPending ? 'Adding...' : 'Add'}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No more project labels to add.
            </p>
          )}
        </div>
      )}

      {isTaskLabelsPending && (
        <p className="mt-3 text-sm text-muted-foreground">Loading labels...</p>
      )}

      {isTaskLabelsError && (
        <p className="mt-3 text-sm text-destructive">Failed to load task labels.</p>
      )}

      {!isTaskLabelsPending && !isTaskLabelsError && (
        <>
          {labels.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No labels.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {labels.map((label) => (
                <TaskLabelItem
                  key={label.id}
                  taskId={taskId}
                  label={label}
                  isEditing={isEditing}
                />
              ))}
            </div>
          )}
        </>
      )}

      {isProjectLabelsError && (
        <p className="mt-2 text-sm text-destructive">
          Failed to load project labels.
        </p>
      )}

      {assignLabelMutation.isError && (
        <p className="mt-2 text-sm text-destructive">Failed to add label.</p>
      )}
    </div>
  );
}

function TaskLabelItem({
  taskId,
  label,
  isEditing,
}: {
  taskId: number;
  label: TaskLabel;
  isEditing: boolean;
}) {
  const removeLabelMutation = useRemoveLabel(taskId, label.id);

  const handleRemove = async () => {
    try {
      await removeLabelMutation.mutateAsync();
    } catch {
      return;
    }
  };

  return (
    <Badge variant="secondary">
      <span>{label.name}</span>

      {isEditing && (
        <Button
          variant="destructive"
          type="button"
          onClick={() => void handleRemove()}
          disabled={removeLabelMutation.isPending}
        >
          {removeLabelMutation.isPending ? 'Removing...' : 'Remove'}
        </Button>
      )}
    </Badge>
  );
}

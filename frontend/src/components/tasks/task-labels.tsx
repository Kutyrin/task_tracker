'use client';

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
        <h2 className="text-sm font-semibold text-slate-950">Labels</h2>

        {projectId && (
          <button
            type="button"
            onClick={() => setIsEditing((value) => !value)}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            {isEditing ? 'Done' : 'Edit labels'}
          </button>
        )}
      </div>

      {isEditing && projectId && (
        <div className="mt-3 flex flex-wrap gap-2">
          {availableLabels.length > 0 ? (
            <>
              <select
                value={selectedLabelId}
                onChange={(event) => setSelectedLabelId(event.target.value)}
                disabled={
                  isProjectLabelsPending || assignLabelMutation.isPending
                }
                className="min-w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select a label</option>

                {availableLabels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void handleAssign()}
                disabled={!selectedLabelId || assignLabelMutation.isPending}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assignLabelMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No more project labels to add.
            </p>
          )}
        </div>
      )}

      {isTaskLabelsPending && (
        <p className="mt-3 text-sm text-slate-500">Loading labels...</p>
      )}

      {isTaskLabelsError && (
        <p className="mt-3 text-sm text-red-600">Failed to load task labels.</p>
      )}

      {!isTaskLabelsPending && !isTaskLabelsError && (
        <>
          {labels.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No labels.</p>
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
        <p className="mt-2 text-sm text-red-600">
          Failed to load project labels.
        </p>
      )}

      {assignLabelMutation.isError && (
        <p className="mt-2 text-sm text-red-600">Failed to add label.</p>
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
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
      <span>{label.name}</span>

      {isEditing && (
        <button
          type="button"
          onClick={() => void handleRemove()}
          disabled={removeLabelMutation.isPending}
          className="font-medium text-slate-500 underline decoration-transparent underline-offset-2 transition hover:text-red-600 hover:decoration-current disabled:cursor-not-allowed disabled:opacity-50"
        >
          {removeLabelMutation.isPending ? 'Removing...' : 'Remove'}
        </button>
      )}
    </span>
  );
}

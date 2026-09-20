'use client';

import { useState } from 'react';

import { useCreateLabel } from '@/hooks/labels/use-create-label';
import { useDeleteLabel } from '@/hooks/labels/use-delete-label';
import { useProjectLabels } from '@/hooks/labels/use-project-labels';
import { useUpdateLabel } from '@/hooks/labels/use-update-label';
import type { Label } from '@/lib/labels';

interface ProjectLabelsProps {
  projectId: number;
}

export function ProjectLabels({ projectId }: ProjectLabelsProps) {
  const { data: labels, isPending, isError } = useProjectLabels(projectId);

  const [isCreating, setIsCreating] = useState(false);

  const createLabelMutation = useCreateLabel(projectId);

  const [name, setName] = useState('');

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length > 50) {
      return;
    }

    try {
      await createLabelMutation.mutateAsync({
        name: trimmedName,
      });

      setName('');
      setIsCreating(false);
    } catch {
      return;
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Labels</h2>

          <p className="mt-1 text-sm text-slate-600">
            Labels available for issues in this project.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating((value) => !value)}
          className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          {isCreating ? 'Cancel' : 'Create label'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="mt-5 flex flex-wrap gap-3">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            placeholder="Label name"
            className="min-w-60 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
          />

          <button
            type="submit"
            disabled={createLabelMutation.isPending || !name.trim()}
            className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createLabelMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {createLabelMutation.isError && (
        <p className="mt-3 text-sm text-red-600">
          Failed to create label. The name may already exist.
        </p>
      )}

      <div className="mt-6">
        {isPending && (
          <p className="text-sm text-slate-500">Loading labels...</p>
        )}

        {isError && (
          <p className="text-sm text-red-600">Failed to load project labels.</p>
        )}

        {!isPending && !isError && labels?.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No labels yet.
          </p>
        )}

        {!isPending && !isError && labels && labels.length > 0 && (
          <div className="space-y-3">
            {labels.map((label) => (
              <ProjectLabelRow
                key={label.id}
                projectId={projectId}
                label={label}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectLabelRow({
  projectId,
  label,
}: {
  projectId: number;
  label: Label;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(label.name);

  const updateLabelMutation = useUpdateLabel(projectId, label.id);
  const deleteLabelMutation = useDeleteLabel(projectId, label.id);

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length > 50) {
      return;
    }

    try {
      await updateLabelMutation.mutateAsync({
        name: trimmedName,
      });

      setIsEditing(false);
    } catch {
      return;
    }
  };

  const handleDelete = async () => {
    if (label._count?.tasks && label._count.tasks > 0) {
      const confirmed = window.confirm(
        `This label is assigned to ${label._count.tasks} issue(s). Delete it anyway?`,
      );

      if (!confirmed) {
        return;
      }
    } else {
      const confirmed = window.confirm(
        `Delete "${label.name}"? This action cannot be undone.`,
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      await deleteLabelMutation.mutateAsync();
    } catch {
      return;
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      {isEditing ? (
        <form onSubmit={handleUpdate} className="flex flex-wrap gap-3">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            className="min-w-60 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-900"
          />

          <button
            type="submit"
            disabled={updateLabelMutation.isPending || !name.trim()}
            className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateLabelMutation.isPending ? 'Saving...' : 'Save'}
          </button>

          <button
            type="button"
            onClick={() => {
              setName(label.name);
              setIsEditing(false);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              {label.name}
            </span>

            <span className="text-xs text-slate-500">
              {label._count?.tasks ?? 0}{' '}
              {label._count?.tasks === 1 ? 'issue' : 'issues'}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs font-medium text-slate-600 transition hover:text-slate-950"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteLabelMutation.isPending}
              className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteLabelMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {updateLabelMutation.isError && (
        <p className="mt-2 text-sm text-red-600">
          Failed to update label. The name may already exist.
        </p>
      )}

      {deleteLabelMutation.isError && (
        <p className="mt-2 text-sm text-red-600">Failed to delete label.</p>
      )}
    </div>
  );
}

'use client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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
    <Card asChild>
      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Labels</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Labels available for issues in this project.
            </p>
          </div>

          <Button
            variant="default"
            type="button"
            onClick={() => setIsCreating((value) => !value)}
          >
            {isCreating ? 'Cancel' : 'Create label'}
          </Button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreate} className="mt-5 flex flex-wrap gap-3">
            <Input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
              placeholder="Label name"
              className="min-w-60 flex-1"
            />

            <Button
              variant="default"
              type="submit"
              disabled={createLabelMutation.isPending || !name.trim()}
            >
              {createLabelMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </form>
        )}

        {createLabelMutation.isError && (
          <p className="mt-3 text-sm text-destructive">
            Failed to create label. The name may already exist.
          </p>
        )}

        <div className="mt-6">
          {isPending && (
            <p className="text-sm text-muted-foreground">Loading labels...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">
              Failed to load project labels.
            </p>
          )}

          {!isPending && !isError && labels?.length === 0 && (
            <p className="rounded-xl border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">
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
    </Card>
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
    <div className="rounded-xl border border-border p-4">
      {isEditing ? (
        <form onSubmit={handleUpdate} className="flex flex-wrap gap-3">
          <Input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            className="min-w-60 flex-1"
          />

          <Button
            variant="default"
            type="submit"
            disabled={updateLabelMutation.isPending || !name.trim()}
          >
            {updateLabelMutation.isPending ? 'Saving...' : 'Save'}
          </Button>

          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setName(label.name);
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Badge variant="secondary">{label.name}</Badge>

            <span className="text-xs text-muted-foreground">
              {label._count?.tasks ?? 0}{' '}
              {label._count?.tasks === 1 ? 'issue' : 'issues'}
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>

            <Button
              variant="destructive"
              size="sm"
              type="button"
              onClick={handleDelete}
              disabled={deleteLabelMutation.isPending}
            >
              {deleteLabelMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      )}

      {updateLabelMutation.isError && (
        <p className="mt-2 text-sm text-destructive">
          Failed to update label. The name may already exist.
        </p>
      )}

      {deleteLabelMutation.isError && (
        <p className="mt-2 text-sm text-destructive">Failed to delete label.</p>
      )}
    </div>
  );
}

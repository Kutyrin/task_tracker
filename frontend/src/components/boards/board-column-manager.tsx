'use client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { useState } from 'react';
import { z } from 'zod';

import { useCreateColumn } from '@/hooks/boards/use-create-column';
import { useDeleteColumn } from '@/hooks/boards/use-delete-column';
import { useUpdateColumn } from '@/hooks/boards/use-update-column';
import type { BoardColumn } from '@/lib/boards';

const columnSchema = z
  .string()
  .trim()
  .min(1, 'Column name is required')
  .max(100, 'Column name must contain at most 100 characters');

interface BoardColumnManagerProps {
  boardId: number;
  columns: BoardColumn[];
}

export function BoardColumnManager({
  boardId,
  columns,
}: BoardColumnManagerProps) {
  const createColumnMutation = useCreateColumn(boardId);
  const updateColumnMutation = useUpdateColumn(boardId);
  const deleteColumnMutation = useDeleteColumn(boardId);

  const [newColumnName, setNewColumnName] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  const orderedColumns = [...columns].sort((a, b) => a.position - b.position);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = columnSchema.safeParse(newColumnName);

    if (!result.success) {
      return;
    }

    try {
      await createColumnMutation.mutateAsync(result.data);
      setNewColumnName('');
    } catch {
      return;
    }
  };

  const startEditing = (column: BoardColumn) => {
    setEditingColumnId(column.id);
    setEditingColumnName(column.name);
  };

  const cancelEditing = () => {
    setEditingColumnId(null);
    setEditingColumnName('');
  };

  const handleUpdate = async (columnId: number) => {
    const result = columnSchema.safeParse(editingColumnName);

    if (!result.success) {
      return;
    }

    try {
      await updateColumnMutation.mutateAsync({
        columnId,
        name: result.data,
      });

      cancelEditing();
    } catch {
      return;
    }
  };

  const handleDelete = async (column: BoardColumn) => {
    if (column._count.tasks > 0) {
      window.alert('Cannot delete a column containing tasks.');
      return;
    }

    const confirmed = window.confirm(
      `Delete column "${column.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteColumnMutation.mutateAsync(column.id);

      if (editingColumnId === column.id) {
        cancelEditing();
      }
    } catch {
      return;
    }
  };

  return (
    <Card asChild>
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Column management
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Create, rename, or delete board columns.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row"
        >
          <Input
            value={newColumnName}
            onChange={(event) => setNewColumnName(event.target.value)}
            type="text"
            autoComplete="off"
            placeholder="New column"
            className="flex-1"
          />

          <Button
            variant="default"
            type="submit"
            disabled={createColumnMutation.isPending}
          >
            {createColumnMutation.isPending ? 'Creating...' : 'Create column'}
          </Button>
        </form>

        {createColumnMutation.isError && (
          <p className="mt-2 text-sm text-destructive">Failed to create column.</p>
        )}

        <div className="mt-6 space-y-3">
          {orderedColumns.map((column) => {
            const isEditing = editingColumnId === column.id;

            return (
              <div
                key={column.id}
                className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                {isEditing ? (
                  <Input
                    value={editingColumnName}
                    onChange={(event) =>
                      setEditingColumnName(event.target.value)
                    }
                    type="text"
                    autoFocus
                    className="flex-1"
                  />
                ) : (
                  <div>
                    <p className="font-medium text-foreground">{column.name}</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {column._count.tasks} tasks
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="default"
                        type="button"
                        onClick={() => handleUpdate(column.id)}
                        disabled={updateColumnMutation.isPending}
                      >
                        {updateColumnMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>

                      <Button
                        variant="outline"
                        type="button"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => startEditing(column)}
                    >
                      Rename
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    type="button"
                    onClick={() => handleDelete(column)}
                    disabled={deleteColumnMutation.isPending}
                  >
                    {deleteColumnMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {updateColumnMutation.isError && (
          <p className="mt-2 text-sm text-destructive">Failed to update column.</p>
        )}

        {deleteColumnMutation.isError && (
          <p className="mt-2 text-sm text-destructive">Failed to delete column.</p>
        )}
      </div>
    </Card>
  );
}

'use client';

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
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">
          Column management
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Create, rename, or delete board columns.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row"
      >
        <input
          value={newColumnName}
          onChange={(event) => setNewColumnName(event.target.value)}
          type="text"
          autoComplete="off"
          placeholder="New column"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
        />

        <button
          type="submit"
          disabled={createColumnMutation.isPending}
          className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createColumnMutation.isPending ? 'Creating...' : 'Create column'}
        </button>
      </form>

      {createColumnMutation.isError && (
        <p className="mt-2 text-sm text-red-600">Failed to create column.</p>
      )}

      <div className="mt-6 space-y-3">
        {orderedColumns.map((column) => {
          const isEditing = editingColumnId === column.id;

          return (
            <div
              key={column.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              {isEditing ? (
                <input
                  value={editingColumnName}
                  onChange={(event) => setEditingColumnName(event.target.value)}
                  type="text"
                  autoFocus
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
                />
              ) : (
                <div>
                  <p className="font-medium text-slate-950">{column.name}</p>

                  <p className="mt-1 text-sm text-slate-500">
                    {column._count.tasks} tasks
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdate(column.id)}
                      disabled={updateColumnMutation.isPending}
                      className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateColumnMutation.isPending ? 'Saving...' : 'Save'}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(column)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Rename
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(column)}
                  disabled={deleteColumnMutation.isPending}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleteColumnMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {updateColumnMutation.isError && (
        <p className="mt-2 text-sm text-red-600">Failed to update column.</p>
      )}

      {deleteColumnMutation.isError && (
        <p className="mt-2 text-sm text-red-600">Failed to delete column.</p>
      )}
    </div>
  );
}

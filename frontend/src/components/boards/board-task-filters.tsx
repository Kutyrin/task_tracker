'use client';

import type { Task } from '@/lib/tasks';

type IssueTypeFilter = 'ALL' | Task['issueType'];
type PriorityFilter = 'ALL' | Task['priority'];

interface BoardTaskFiltersProps {
  search: string;
  columnId: number | null;
  issueType: IssueTypeFilter;
  priority: PriorityFilter;
  assigneeId: number | 'UNASSIGNED' | null;
  labelId: number | null;
  columns: {
    id: number;
    name: string;
  }[];
  members: {
    id: number;
    email: string;
  }[];
  labels: {
    id: number;
    name: string;
  }[];
  onSearchChange: (value: string) => void;
  onColumnChange: (value: number | null) => void;
  onIssueTypeChange: (value: IssueTypeFilter) => void;
  onPriorityChange: (value: PriorityFilter) => void;
  onAssigneeChange: (value: number | 'UNASSIGNED' | null) => void;
  onLabelChange: (value: number | null) => void;
  onReset: () => void;
}

const issueTypeOptions = [
  { value: 'TASK', label: 'Task' },
  { value: 'BUG', label: 'Bug' },
  { value: 'STORY', label: 'Story' },
  { value: 'EPIC', label: 'Epic' },
] satisfies {
  value: Task['issueType'];
  label: string;
}[];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
] satisfies {
  value: Task['priority'];
  label: string;
}[];

export function BoardTaskFilters({
  search,
  columnId,
  issueType,
  priority,
  assigneeId,
  labelId,
  columns,
  members,
  labels,
  onSearchChange,
  onColumnChange,
  onIssueTypeChange,
  onPriorityChange,
  onAssigneeChange,
  onLabelChange,
  onReset,
}: BoardTaskFiltersProps) {
  const hasActiveFilters =
    search.trim() !== '' ||
    columnId !== null ||
    issueType !== 'ALL' ||
    priority !== 'ALL' ||
    assigneeId !== null ||
    labelId !== null;

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label
            htmlFor="board-task-search"
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            Search
          </label>

          <input
            id="board-task-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Issue key, title or description"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="board-task-status"
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            Status
          </label>

          <select
            id="board-task-status"
            value={columnId ?? 'ALL'}
            onChange={(event) => {
              onColumnChange(
                event.target.value === 'ALL'
                  ? null
                  : Number(event.target.value),
              );
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="ALL">All statuses</option>

            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="board-task-type"
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            Issue type
          </label>

          <select
            id="board-task-type"
            value={issueType}
            onChange={(event) =>
              onIssueTypeChange(event.target.value as IssueTypeFilter)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="ALL">All types</option>

            {issueTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="board-task-assignee"
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            Assignee
          </label>

          <select
            id="board-task-assignee"
            value={assigneeId ?? 'ALL'}
            onChange={(event) => {
              const value = event.target.value;

              onAssigneeChange(
                value === 'ALL'
                  ? null
                  : value === 'UNASSIGNED'
                    ? 'UNASSIGNED'
                    : Number(value),
              );
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="ALL">All assignees</option>
            <option value="UNASSIGNED">Unassigned</option>

            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="board-task-label"
            className="mb-1.5 block text-xs font-medium text-slate-600"
          >
            Label
          </label>

          <select
            id="board-task-label"
            value={labelId ?? 'ALL'}
            onChange={(event) => {
              onLabelChange(
                event.target.value === 'ALL'
                  ? null
                  : Number(event.target.value),
              );
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="ALL">All labels</option>

            {labels.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}

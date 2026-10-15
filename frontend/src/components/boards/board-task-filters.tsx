'use client';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';

import type { Task, TaskSortBy, SortOrder } from '@/lib/tasks';

type IssueTypeFilter = 'ALL' | Task['issueType'];
type PriorityFilter = 'ALL' | Task['priority'];

const sortOptions = [
  { value: 'position', label: 'Board position' },
  { value: 'priority', label: 'Priority' },
  { value: 'createdAt', label: 'Created date' },
  { value: 'updatedAt', label: 'Updated date' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'title', label: 'Title' },
] satisfies {
  value: TaskSortBy;
  label: string;
}[];

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
  sortBy: TaskSortBy;
  sortOrder: SortOrder;
  onSortByChange: (value: TaskSortBy) => void;
  onSortOrderChange: (value: SortOrder) => void;
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
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: BoardTaskFiltersProps) {
  const hasActiveFilters =
    search.trim() !== '' ||
    columnId !== null ||
    issueType !== 'ALL' ||
    priority !== 'ALL' ||
    assigneeId !== null ||
    labelId !== null;

  return (
    <Card asChild>
      <div className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label
              htmlFor="board-task-search"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Search
            </Label>

            <Input
              id="board-task-search"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Issue key, title or description"
              className="w-full"
            />
          </div>

          <div>
            <Label
              htmlFor="board-task-status"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Status
            </Label>

            <NativeSelect
              id="board-task-status"
              value={columnId ?? 'ALL'}
              onChange={(event) => {
                onColumnChange(
                  event.target.value === 'ALL'
                    ? null
                    : Number(event.target.value),
                );
              }}
              className="w-full"
            >
              <option value="ALL">All statuses</option>

              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label
              htmlFor="board-task-type"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Issue type
            </Label>

            <NativeSelect
              id="board-task-type"
              value={issueType}
              onChange={(event) =>
                onIssueTypeChange(event.target.value as IssueTypeFilter)
              }
              className="w-full"
            >
              <option value="ALL">All types</option>

              {issueTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label
              htmlFor="board-task-priority"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Priority
            </Label>

            <NativeSelect
              id="board-task-priority"
              value={priority}
              onChange={(event) =>
                onPriorityChange(event.target.value as PriorityFilter)
              }
              className="w-full"
            >
              <option value="ALL">All priorities</option>

              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label
              htmlFor="board-task-assignee"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Assignee
            </Label>

            <NativeSelect
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
              className="w-full"
            >
              <option value="ALL">All assignees</option>
              <option value="UNASSIGNED">Unassigned</option>

              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.email}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label
              htmlFor="board-task-label"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Label
            </Label>

            <NativeSelect
              id="board-task-label"
              value={labelId ?? 'ALL'}
              onChange={(event) => {
                onLabelChange(
                  event.target.value === 'ALL'
                    ? null
                    : Number(event.target.value),
                );
              }}
              className="w-full"
            >
              <option value="ALL">All labels</option>

              {labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label
              htmlFor="board-task-sort"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Sort by
            </Label>

            <NativeSelect
              id="board-task-sort"
              value={sortBy}
              onChange={(event) =>
                onSortByChange(event.target.value as TaskSortBy)
              }
              className="w-full"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label
              htmlFor="board-task-sort-order"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Order
            </Label>

            <NativeSelect
              id="board-task-sort-order"
              value={sortOrder}
              onChange={(event) =>
                onSortOrderChange(event.target.value as SortOrder)
              }
              className="w-full"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </NativeSelect>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" type="button" onClick={onReset}>
              Reset filters
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

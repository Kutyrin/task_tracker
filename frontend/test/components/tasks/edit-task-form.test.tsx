import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditTaskForm } from '@/components/tasks/edit-task-form';

const mockMutateAsync = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/tasks/use-update-task', () => ({
  useUpdateTask: () => ({
    mutateAsync: mockMutateAsync,
    isError: false,
    isPending: false,
  }),
}));

const task = {
  id: 42,
  title: 'Original task',
  description: 'Original description',
  issueNumber: 7,
  issueKey: 'TASK-7',
  issueType: 'TASK' as const,
  priority: 'MEDIUM' as const,
  dueDate: '2026-09-20T00:00:00.000Z',
  position: 0,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  userId: 1,
  reporterId: 1,
  assigneeId: 2,
  projectId: 20,
  columnId: 1,
  project: null,
  column: {
    id: 1,
    name: 'Backlog',
    position: 0,
    boardId: 10,
  },
  reporter: {
    id: 1,
    email: 'reporter@example.com',
  },
  assignee: {
    id: 2,
    email: 'assignee@example.com',
  },
  labels: [],
};

const members = [
  {
    id: 2,
    email: 'assignee@example.com',
  },
];

describe('EditTaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(task);
  });

  it('renders existing task values', () => {
    render(
      <EditTaskForm
        boardId={10}
        task={task}
        members={members}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Title')).toHaveValue('Original task');
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Original description',
    );
    expect(screen.getByLabelText('Issue type')).toHaveValue('TASK');
    expect(screen.getByLabelText('Priority')).toHaveValue('MEDIUM');
    expect(screen.getByLabelText('Assignee')).toHaveValue('2');
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-09-20');
  });

  it('validates an empty title', async () => {
    render(
      <EditTaskForm
        boardId={10}
        task={task}
        members={members}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('updates the task and calls onSaved', async () => {
    const onSaved = vi.fn();

    render(
      <EditTaskForm
        boardId={10}
        task={task}
        members={members}
        onCancel={vi.fn()}
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Updated task' },
    });

    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'HIGH' },
    });

    fireEvent.change(screen.getByLabelText('Assignee'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Updated task',
        description: 'Original description',
        issueType: 'TASK',
        priority: 'HIGH',
        assigneeId: null,
        dueDate: '2026-09-20',
      });
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel', () => {
    const onCancel = vi.fn();

    render(
      <EditTaskForm
        boardId={10}
        task={task}
        members={members}
        onCancel={onCancel}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

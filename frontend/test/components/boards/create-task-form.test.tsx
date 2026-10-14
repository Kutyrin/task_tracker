import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateTaskForm } from '@/components/boards/create-task-form';

const mockMutateAsync = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/tasks/use-create-task', () => ({
  useCreateTask: () => ({
    mutateAsync: mockMutateAsync,
    isError: false,
    isPending: false,
  }),
}));

const columns = [
  {
    id: 1,
    name: 'Backlog',
    position: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    boardId: 10,
    _count: { tasks: 0 },
    tasks: [],
  },
  {
    id: 2,
    name: 'In Progress',
    position: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    boardId: 10,
    _count: { tasks: 0 },
    tasks: [],
  },
];

const members = [
  {
    id: 1,
    email: 'user@example.com',
  },
];

describe('CreateTaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({
      id: 1,
      title: 'Created task',
    });
  });

  it('renders the task form', () => {
    render(
      <CreateTaskForm
        boardId={10}
        projectId={20}
        columns={columns}
        members={members}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Create issue' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Issue type')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Column')).toBeInTheDocument();
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument();
    expect(screen.getByLabelText('Due date')).toBeInTheDocument();
  });

  it('validates an empty title', async () => {
    render(
      <CreateTaskForm
        boardId={10}
        projectId={20}
        columns={columns}
        members={members}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('submits the task and resets the form', async () => {
    render(
      <CreateTaskForm
        boardId={10}
        projectId={20}
        columns={columns}
        members={members}
      />,
    );

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Implement testing' },
    });

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Add frontend tests' },
    });

    fireEvent.change(screen.getByLabelText('Issue type'), {
      target: { value: 'BUG' },
    });

    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'HIGH' },
    });

    fireEvent.change(screen.getByLabelText('Column'), {
      target: { value: '2' },
    });

    fireEvent.change(screen.getByLabelText('Assignee'), {
      target: { value: '1' },
    });

    fireEvent.change(screen.getByLabelText('Due date'), {
      target: { value: '2026-10-15' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Implement testing',
        description: 'Add frontend tests',
        issueType: 'BUG',
        priority: 'HIGH',
        projectId: 20,
        columnId: 2,
        assigneeId: 1,
        dueDate: '2026-10-15',
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });
  });

  it('shows an API error', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Request failed'));

    vi.doMock('@/hooks/tasks/use-create-task', () => ({
      useCreateTask: () => ({
        mutateAsync: mockMutateAsync,
        isError: true,
        isPending: false,
      }),
    }));

    render(
      <CreateTaskForm
        boardId={10}
        projectId={20}
        columns={columns}
        members={members}
      />,
    );

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Broken task' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });
});

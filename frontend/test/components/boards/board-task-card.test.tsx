import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseSortable = vi.hoisted(() => vi.fn());
const mockDeleteTask = vi.hoisted(() => vi.fn());

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: (...args: unknown[]) => mockUseSortable(...args),
}));

vi.mock('@/hooks/tasks/use-delete-task', () => ({
  useDeleteTask: () => ({
    mutateAsync: mockDeleteTask,
    isPending: false,
    isError: false,
  }),
}));

import { BoardTaskCard } from '@/components/boards/board-task-card';

const task = {
  id: 42,
  title: 'Prepare release',
  description: 'Release the new version',
  issueNumber: 7,
  issueKey: 'TASK-7',
  issueType: 'BUG' as const,
  priority: 'HIGH' as const,
  dueDate: '2026-09-20T00:00:00.000Z',
  position: 1000,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
  userId: 1,
  reporterId: 1,
  assigneeId: 2,
  projectId: 10,
  columnId: 2,
  project: null,
  column: {
    id: 2,
    name: 'In Progress',
    position: 1000,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    boardId: 20,
  },
  reporter: {
    id: 1,
    email: 'reporter@example.com',
  },
  assignee: {
    id: 2,
    email: 'assignee@example.com',
  },
  labels: [
    {
      id: 5,
      name: 'Frontend',
    },
  ],
};

describe('BoardTaskCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    });

    mockDeleteTask.mockResolvedValue({});
  });

  it('renders task information and task link', () => {
    render(<BoardTaskCard task={task} />);

    expect(screen.getByText('TASK-7')).toBeInTheDocument();
    expect(screen.getByText('Prepare release')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('assignee@example.com')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'TASK-7' })).toHaveAttribute(
      'href',
      '/tasks/42',
    );
  });

  it('deletes the task after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<BoardTaskCard task={task} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete TASK-7' }));

    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledTimes(1);
    });
  });

  it('does not delete the task when confirmation is rejected', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<BoardTaskCard task={task} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete TASK-7' }));

    expect(mockDeleteTask).not.toHaveBeenCalled();
  });
});

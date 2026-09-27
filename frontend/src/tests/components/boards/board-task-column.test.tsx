import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseDndContext = vi.hoisted(() => vi.fn());
const mockUseDroppable = vi.hoisted(() => vi.fn());
const mockUseSortable = vi.hoisted(() => vi.fn());
const mockDeleteTask = vi.hoisted(() => vi.fn());

vi.mock('@dnd-kit/core', () => ({
  useDndContext: (...args: unknown[]) => mockUseDndContext(...args),
  useDroppable: (...args: unknown[]) => mockUseDroppable(...args),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  verticalListSortingStrategy: {},
  useSortable: (...args: unknown[]) => mockUseSortable(...args),
}));

vi.mock('@/hooks/tasks/use-delete-task', () => ({
  useDeleteTask: () => ({
    mutateAsync: mockDeleteTask,
    isPending: false,
    isError: false,
  }),
}));

import { BoardTaskColumn } from '@/components/boards/board-task-column';

const createTask = (
  id: number,
  title: string,
  position: number,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
) => ({
  id,
  title,
  description: null,
  issueNumber: id,
  issueKey: `TASK-${id}`,
  issueType: 'TASK' as const,
  priority,
  dueDate: null,
  position,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  userId: 1,
  reporterId: 1,
  assigneeId: null,
  projectId: 10,
  columnId: 1,
  project: null,
  column: {
    id: 1,
    name: 'Backlog',
    position: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    boardId: 20,
  },
  reporter: {
    id: 1,
    email: 'user@example.com',
  },
  assignee: null,
  labels: [],
});

const createColumn = (tasks: ReturnType<typeof createTask>[]) => ({
  id: 1,
  name: 'Backlog',
  position: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  boardId: 20,
  _count: {
    tasks: tasks.length,
  },
  tasks,
});

describe('BoardTaskColumn', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDndContext.mockReturnValue({
      active: null,
      over: null,
    });

    mockUseDroppable.mockReturnValue({
      setNodeRef: vi.fn(),
      isOver: false,
    });

    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    });
  });

  it('renders the column and tasks sorted by position', () => {
    const laterTask = createTask(2, 'Later task', 2000);
    const firstTask = createTask(1, 'First task', 1000);

    render(<BoardTaskColumn column={createColumn([laterTask, firstTask])} />);

    expect(
      screen.getByRole('heading', { name: 'Backlog' }),
    ).toBeInTheDocument();

    expect(screen.getByText('First task')).toBeInTheDocument();
    expect(screen.getByText('Later task')).toBeInTheDocument();

    const taskTitles = screen
      .getAllByRole('article')
      .map((article) => article.querySelector('h3')?.textContent);

    expect(taskTitles).toEqual(['First task', 'Later task']);
  });

  it('shows the empty state when there are no tasks', () => {
    render(<BoardTaskColumn column={createColumn([])} />);

    expect(screen.getByText('No issues yet')).toBeInTheDocument();
  });

  it('shows the filtered empty state when filters are active', () => {
    render(<BoardTaskColumn column={createColumn([])} hasActiveFilters />);

    expect(screen.getByText('No matching issues')).toBeInTheDocument();
  });

  it('sorts by the original task order when position sorting is disabled', () => {
    const laterTask = createTask(2, 'Later task', 2000);
    const firstTask = createTask(1, 'First task', 1000);

    render(
      <BoardTaskColumn
        column={createColumn([laterTask, firstTask])}
        sortTasksByPosition={false}
      />,
    );

    const taskTitles = screen
      .getAllByRole('article')
      .map((article) => article.querySelector('h3')?.textContent);

    expect(taskTitles).toEqual(['Later task', 'First task']);
  });
});

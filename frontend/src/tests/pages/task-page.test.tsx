import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReplace = vi.hoisted(() => vi.fn());
const mockUseParams = vi.hoisted(() => vi.fn());
const mockUseTask = vi.hoisted(() => vi.fn());
const mockUseProjectMembers = vi.hoisted(() => vi.fn());
const mockUseDeleteTask = vi.hoisted(() => vi.fn());
const mockUseTaskRealtime = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useParams: () => mockUseParams(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/auth/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/tasks/use-task', () => ({
  useTask: (...args: unknown[]) => mockUseTask(...args),
}));

vi.mock('@/hooks/projects/use-project-members', () => ({
  useProjectMembers: (...args: unknown[]) => mockUseProjectMembers(...args),
}));

vi.mock('@/hooks/tasks/use-delete-task', () => ({
  useDeleteTask: (...args: unknown[]) => mockUseDeleteTask(...args),
}));

vi.mock('@/hooks/realtime/use-task-realtime', () => ({
  useTaskRealtime: (...args: unknown[]) => mockUseTaskRealtime(...args),
}));

vi.mock('@/components/tasks/task-details', () => ({
  TaskDetails: ({ task }: { task: { title: string } }) => (
    <div data-testid="task-details">{task.title}</div>
  ),
}));

vi.mock('@/components/tasks/edit-task-form', () => ({
  EditTaskForm: ({
    onCancel,
    onSaved,
  }: {
    onCancel: () => void;
    onSaved: () => void;
  }) => (
    <div data-testid="edit-task-form">
      <button type="button" onClick={onSaved}>
        Save mock
      </button>
      <button type="button" onClick={onCancel}>
        Cancel mock
      </button>
    </div>
  ),
}));

vi.mock('@/components/tasks/comments-section', () => ({
  CommentsSection: () => <div data-testid="comments">Comments</div>,
}));

vi.mock('@/components/tasks/attachments-section', () => ({
  AttachmentsSection: () => <div data-testid="attachments">Attachments</div>,
}));

vi.mock('@/components/tasks/activity-section', () => ({
  ActivitySection: () => <div data-testid="activity">Activity</div>,
}));

import TaskPage from '@/app/tasks/[id]/page';

const task = {
  id: 42,
  title: 'Prepare release',
  description: 'Release the new version',
  issueNumber: 7,
  issueKey: 'TASK-7',
  issueType: 'TASK' as const,
  priority: 'HIGH' as const,
  dueDate: '2026-09-20T00:00:00.000Z',
  position: 0,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
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
  labels: [],
};

describe('TaskPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseParams.mockReturnValue({
      id: '42',
    });

    mockUseTask.mockReturnValue({
      data: task,
      isPending: false,
      isError: false,
    });

    mockUseProjectMembers.mockReturnValue({
      data: [],
    });

    mockUseDeleteTask.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
    });

    mockUseTaskRealtime.mockImplementation(() => undefined);
  });

  it('shows invalid ID state', () => {
    mockUseParams.mockReturnValue({
      id: 'invalid',
    });

    render(<TaskPage />);

    expect(screen.getByText('Invalid issue ID.')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseTask.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });

    render(<TaskPage />);

    expect(screen.getByText('Loading issue...')).toBeInTheDocument();
  });

  it('shows not found state', () => {
    mockUseTask.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    render(<TaskPage />);

    expect(
      screen.getByRole('heading', { name: 'Issue not found' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: 'Back to projects' }),
    ).toHaveAttribute('href', '/projects');
  });

  it('renders task content and related sections', () => {
    render(<TaskPage />);

    expect(screen.getByTestId('task-details')).toHaveTextContent(
      'Prepare release',
    );
    expect(screen.getByTestId('comments')).toBeInTheDocument();
    expect(screen.getByTestId('attachments')).toBeInTheDocument();
    expect(screen.getByTestId('activity')).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: 'Back to Project' }),
    ).toHaveAttribute('href', '/projects/10');

    expect(
      screen.getByRole('link', { name: 'Back to Dashboard' }),
    ).toHaveAttribute('href', '/dashboard');
  });

  it('toggles edit mode and returns to details after save', () => {
    render(<TaskPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit issue' }));

    expect(screen.getByTestId('edit-task-form')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close edit' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save mock' }));

    expect(screen.getByTestId('task-details')).toBeInTheDocument();
  });

  it('deletes the task and redirects to its board', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const mutateAsync = vi.fn().mockResolvedValue({});

    mockUseDeleteTask.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
    });

    render(<TaskPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete issue' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockReplace).toHaveBeenCalledWith('/boards/20');
  });

  it('redirects when realtime reports a remote delete', () => {
    let remoteDeleteHandler: (() => void) | undefined;

    mockUseTaskRealtime.mockImplementation(
      (
        _taskId: number,
        _projectId: number | null,
        onRemoteDelete: () => void,
      ) => {
        remoteDeleteHandler = onRemoteDelete;
      },
    );

    render(<TaskPage />);

    remoteDeleteHandler?.();

    expect(mockReplace).toHaveBeenCalledWith('/boards/20');
  });
});

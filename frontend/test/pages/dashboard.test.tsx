import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseProjects = vi.hoisted(() => vi.fn());
const mockUseDashboardStats = vi.hoisted(() => vi.fn());
const mockUseDashboardRealtime = vi.hoisted(() => vi.fn());
const mockUseAppSelector = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/projects/use-projects', () => ({
  useProjects: () => mockUseProjects(),
}));

vi.mock('@/hooks/projects/use-dashboard-stats', () => ({
  useDashboardStats: () => mockUseDashboardStats(),
}));

vi.mock('@/hooks/realtime/use-dashboard-realtime', () => ({
  useDashboardRealtime: (...args: unknown[]) =>
    mockUseDashboardRealtime(...args),
}));

vi.mock('@/store/hooks', () => ({
  useAppSelector: (...args: unknown[]) => mockUseAppSelector(...args),
}));

vi.mock('@/components/auth/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/auth/logout-button', () => ({
  LogoutButton: () => <button type="button">Logout</button>,
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

import DashboardPage from '@/app/dashboard/page';

const stats = {
  totalProjects: 3,
  totalTasks: 12,
  overdueTasks: 2,
  byPriority: [
    { priority: 'LOW' as const, count: 4 },
    { priority: 'MEDIUM' as const, count: 5 },
    { priority: 'HIGH' as const, count: 3 },
  ],
  byIssueType: [
    { issueType: 'TASK' as const, count: 7 },
    { issueType: 'BUG' as const, count: 3 },
    { issueType: 'STORY' as const, count: 1 },
    { issueType: 'EPIC' as const, count: 1 },
  ],
  byColumn: [
    { columnId: 1, columnName: 'Backlog', count: 6 },
    { columnId: 2, columnName: 'In Progress', count: 4 },
    { columnId: 3, columnName: 'Done', count: 2 },
  ],
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAppSelector.mockImplementation((selector: unknown) =>
      (selector as (state: unknown) => unknown)({
        auth: {
          user: {
            userId: 1,
            email: 'user@example.com',
          },
        },
      }),
    );

    mockUseProjects.mockReturnValue({
      data: [{ id: 10 }, { id: 20 }],
    });

    mockUseDashboardRealtime.mockImplementation(() => undefined);

    mockUseDashboardStats.mockReturnValue({
      data: stats,
      isPending: false,
      isError: false,
    });
  });

  it('renders dashboard statistics and navigation', () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Welcome, user@example.com',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();

    const projectCard = screen.getByText('Projects').parentElement;
    const taskCard = screen.getByText('Tasks').parentElement;
    const overdueCard = screen.getByText('Overdue').parentElement;

    expect(projectCard).not.toBeNull();
    expect(taskCard).not.toBeNull();
    expect(overdueCard).not.toBeNull();

    expect(projectCard).toHaveTextContent('3');
    expect(taskCard).toHaveTextContent('12');
    expect(overdueCard).toHaveTextContent('2');

    expect(screen.getByRole('link', { name: 'View projects' })).toHaveAttribute(
      'href',
      '/projects',
    );

    expect(screen.getByRole('link', { name: 'Open calendar' })).toHaveAttribute(
      'href',
      '/calendar',
    );

    expect(mockUseDashboardRealtime).toHaveBeenCalledWith([10, 20]);
  });

  it('renders the loading state', () => {
    mockUseDashboardStats.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });

    render(<DashboardPage />);

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('renders the error state', () => {
    mockUseDashboardStats.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    render(<DashboardPage />);

    expect(
      screen.getByRole('heading', { name: 'Failed to load dashboard' }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Statistics could not be loaded.'),
    ).toBeInTheDocument();
  });
});

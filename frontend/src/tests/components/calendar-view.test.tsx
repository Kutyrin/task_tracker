import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CalendarView } from '@/components/calendar/calendar-view';

const mockUseProjects = vi.fn();
const mockUseCalendarTasks = vi.fn();
const mockUseCalendarRealtime = vi.fn();

vi.mock('@/hooks/projects/use-projects', () => ({
  useProjects: () => mockUseProjects(),
}));

vi.mock('@/hooks/calendar/use-calendar-tasks', () => ({
  useCalendarTasks: (...args: unknown[]) => mockUseCalendarTasks(...args),
}));

vi.mock('@/hooks/realtime/use-calendar-realtime', () => ({
  useCalendarRealtime: (...args: unknown[]) => mockUseCalendarRealtime(...args),
}));

describe('CalendarView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15));

    mockUseProjects.mockReturnValue({
      data: [{ id: 1 }, { id: 2 }],
    });

    mockUseCalendarTasks.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });

    mockUseCalendarRealtime.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the current month', () => {
    render(<CalendarView />);

    expect(
      screen.getByRole('heading', { name: 'September 2026' }),
    ).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<CalendarView />);

    expect(
      screen.getByRole('link', { name: 'Back to Projects' }),
    ).toHaveAttribute('href', '/projects');

    expect(
      screen.getByRole('link', { name: 'Back to Dashboard' }),
    ).toHaveAttribute('href', '/dashboard');
  });

  it('renders loading state', () => {
    mockUseCalendarTasks.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });

    render(<CalendarView />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseCalendarTasks.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    render(<CalendarView />);

    expect(
      screen.getByRole('heading', { name: 'Failed to load calendar' }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Tasks could not be loaded for this period.'),
    ).toBeInTheDocument();
  });

  it('renders tasks in the calendar', () => {
    mockUseCalendarTasks.mockReturnValue({
      data: [
        {
          id: 42,
          title: 'Prepare release',
          issueNumber: 7,
          issueKey: 'TASK-7',
          issueType: 'TASK',
          priority: 'HIGH',
          dueDate: '2026-09-15T14:30:00.000Z',
          position: 0,
          createdAt: '2026-09-01T10:00:00.000Z',
          updatedAt: '2026-09-01T10:00:00.000Z',
          userId: 1,
          reporterId: 1,
          assigneeId: 2,
          projectId: 1,
          columnId: 1,
          project: {
            id: 1,
            name: 'Task Tracker',
            key: 'TASK',
          },
          column: {
            id: 1,
            name: 'To Do',
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
        },
      ],
      isPending: false,
      isError: false,
    });

    render(<CalendarView />);

    expect(screen.getByText('TASK-7')).toBeInTheDocument();
    expect(screen.getByText('Prepare release')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /TASK-7.*Prepare release/i }),
    ).toHaveAttribute('href', '/tasks/42');
  });

  it('navigates to the next month', () => {
    render(<CalendarView />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(
      screen.getByRole('heading', { name: 'October 2026' }),
    ).toBeInTheDocument();
  });

  it('navigates to the previous month', () => {
    render(<CalendarView />);

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

    expect(
      screen.getByRole('heading', { name: 'August 2026' }),
    ).toBeInTheDocument();
  });

  it('returns to the current month with Today', () => {
    render(<CalendarView />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      screen.getByRole('heading', { name: 'October 2026' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(
      screen.getByRole('heading', { name: 'September 2026' }),
    ).toBeInTheDocument();
  });

  it('passes project ids to realtime hook', () => {
    render(<CalendarView />);

    expect(mockUseCalendarRealtime).toHaveBeenCalledWith([1, 2]);
  });

  it('shows singular task count', () => {
    mockUseCalendarTasks.mockReturnValue({
      data: [
        {
          id: 1,
          title: 'Single task',
          issueNumber: 1,
          issueKey: 'TASK-1',
          issueType: 'TASK',
          priority: 'LOW',
          dueDate: '2026-09-15T10:00:00.000Z',
          position: 0,
          createdAt: '2026-09-01T10:00:00.000Z',
          updatedAt: '2026-09-01T10:00:00.000Z',
          userId: 1,
          reporterId: 1,
          assigneeId: null,
          projectId: 1,
          columnId: 1,
          project: null,
          column: null,
          reporter: null,
          assignee: null,
          labels: [],
        },
      ],
      isPending: false,
      isError: false,
    });

    render(<CalendarView />);

    expect(screen.getByText('1 task')).toBeInTheDocument();
  });
});

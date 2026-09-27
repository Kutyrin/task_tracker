import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetActivities = vi.hoisted(() => vi.fn());
const mockGetProjectActivities = vi.hoisted(() => vi.fn());
const mockGetCalendarTasks = vi.hoisted(() => vi.fn());
const mockGetDashboardStats = vi.hoisted(() => vi.fn());

vi.mock('@/lib/activities', () => ({
  getActivities: (...args: unknown[]) => mockGetActivities(...args),
  getProjectActivities: (...args: unknown[]) =>
    mockGetProjectActivities(...args),
}));

vi.mock('@/lib/calendar', () => ({
  getCalendarTasks: (...args: unknown[]) => mockGetCalendarTasks(...args),
}));

vi.mock('@/lib/projects', () => ({
  getDashboardStats: (...args: unknown[]) => mockGetDashboardStats(...args),
}));

import { useActivities } from '@/hooks/activities/use-activities';
import { useProjectActivities } from '@/hooks/activities/use-project-activities';
import { useCalendarTasks } from '@/hooks/calendar/use-calendar-tasks';
import { useDashboardStats } from '@/hooks/projects/use-dashboard-stats';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('activity, calendar and dashboard query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches task activities by task id', async () => {
    const queryClient = createQueryClient();
    const activities = [
      {
        id: 1,
        type: 'TASK_CREATED',
      },
    ];

    mockGetActivities.mockResolvedValue(activities);

    const { result } = renderHook(() => useActivities(42), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(activities);
    });

    expect(mockGetActivities).toHaveBeenCalledWith(42);
    expect(queryClient.getQueryData(['activities', 42])).toEqual(activities);
  });

  it('does not fetch task activities for an invalid task id', () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useActivities(0), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetActivities).not.toHaveBeenCalled();
  });

  it('fetches project activities by project id', async () => {
    const queryClient = createQueryClient();
    const activities = [
      {
        id: 1,
        type: 'PROJECT_CREATED',
      },
    ];

    mockGetProjectActivities.mockResolvedValue(activities);

    const { result } = renderHook(() => useProjectActivities(10), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(activities);
    });

    expect(mockGetProjectActivities).toHaveBeenCalledWith(10);
    expect(queryClient.getQueryData(['activities', 'projects', 10])).toEqual(
      activities,
    );
  });

  it('does not fetch project activities for an invalid project id', () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useProjectActivities(-1), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetProjectActivities).not.toHaveBeenCalled();
  });

  it('fetches calendar tasks for the requested date range', async () => {
    const queryClient = createQueryClient();
    const from = '2026-09-01';
    const to = '2026-09-30';
    const tasks = [
      {
        id: 42,
        title: 'Prepare release',
      },
    ];

    mockGetCalendarTasks.mockResolvedValue(tasks);

    const { result } = renderHook(() => useCalendarTasks(from, to), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(tasks);
    });

    expect(mockGetCalendarTasks).toHaveBeenCalledWith(from, to);
    expect(queryClient.getQueryData(['tasks', 'calendar', from, to])).toEqual(
      tasks,
    );
  });

  it('keeps separate cache entries for different calendar ranges', async () => {
    const queryClient = createQueryClient();

    mockGetCalendarTasks
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 2 }]);

    const firstRange = renderHook(
      () => useCalendarTasks('2026-09-01', '2026-09-30'),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    const secondRange = renderHook(
      () => useCalendarTasks('2026-10-01', '2026-10-31'),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => {
      expect(firstRange.result.current.data).toEqual([{ id: 1 }]);
      expect(secondRange.result.current.data).toEqual([{ id: 2 }]);
    });

    expect(
      queryClient.getQueryData([
        'tasks',
        'calendar',
        '2026-09-01',
        '2026-09-30',
      ]),
    ).toEqual([{ id: 1 }]);

    expect(
      queryClient.getQueryData([
        'tasks',
        'calendar',
        '2026-10-01',
        '2026-10-31',
      ]),
    ).toEqual([{ id: 2 }]);
  });

  it('fetches dashboard statistics', async () => {
    const queryClient = createQueryClient();
    const stats = {
      totalProjects: 3,
      totalTasks: 12,
      overdueTasks: 2,
    };

    mockGetDashboardStats.mockResolvedValue(stats);

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(stats);
    });

    expect(mockGetDashboardStats).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['projects', 'stats'])).toEqual(stats);
  });

  it('exposes dashboard statistics errors', async () => {
    const queryClient = createQueryClient();

    mockGetDashboardStats.mockRejectedValue(new Error('Stats request failed'));

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Stats request failed'));
  });
});

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseActivities = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/activities/use-activities', () => ({
  useActivities: () => mockUseActivities(),
}));

import { ActivitySection } from '@/components/tasks/activity-section';

describe('ActivitySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseActivities.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });

    render(<ActivitySection taskId={10} />);

    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseActivities.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    render(<ActivitySection taskId={10} />);

    expect(screen.getByText('Failed to load activity.')).toBeInTheDocument();
  });

  it('renders activity entries', () => {
    mockUseActivities.mockReturnValue({
      data: [
        {
          id: 1,
          type: 'TASK_UPDATED',
          message: 'Priority changed to HIGH',
          createdAt: '2026-09-01T10:00:00.000Z',
          user: {
            id: 1,
            email: 'user@example.com',
          },
        },
      ],
      isPending: false,
      isError: false,
    });

    render(<ActivitySection taskId={10} />);

    expect(screen.getByText('Priority changed to HIGH')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockUseActivities.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });

    render(<ActivitySection taskId={10} />);

    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
  });
});

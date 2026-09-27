import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/tasks/task-labels', () => ({
  TaskLabels: () => <div>Labels</div>,
}));

import { TaskDetails } from '@/components/tasks/task-details';

const task = {
  id: 42,
  title: 'Prepare release',
  description: 'Release the new version',
  issueNumber: 7,
  issueKey: 'TASK-7',
  issueType: 'BUG' as const,
  priority: 'HIGH' as const,
  dueDate: '2026-09-20T00:00:00.000Z',
  position: 0,
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
    position: 1,
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

describe('TaskDetails', () => {
  it('renders task information', () => {
    render(<TaskDetails task={task} />);

    expect(
      screen.getByRole('heading', { name: 'Prepare release' }),
    ).toBeInTheDocument();
    expect(screen.getByText('TASK-7')).toBeInTheDocument();
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Release the new version')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('assignee@example.com')).toBeInTheDocument();
    expect(screen.getByText('reporter@example.com')).toBeInTheDocument();
    expect(screen.getByText('Labels')).toBeInTheDocument();
  });

  it('shows empty values when optional task data is absent', () => {
    render(
      <TaskDetails
        task={{
          ...task,
          description: null,
          dueDate: null,
          column: null,
          assignee: null,
          reporter: null,
          labels: [],
        }}
      />,
    );

    expect(screen.getByText('No description.')).toBeInTheDocument();
    expect(screen.getByText('No column')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('No due date')).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardTaskFilters } from '@/components/boards/board-task-filters';

function renderFilters(overrides = {}) {
  const props = {
    search: '',
    columnId: null,
    issueType: 'ALL' as const,
    priority: 'ALL' as const,
    assigneeId: null,
    labelId: null,
    columns: [
      { id: 1, name: 'Backlog' },
      { id: 2, name: 'In Progress' },
    ],
    members: [{ id: 5, email: 'user@example.com' }],
    labels: [{ id: 8, name: 'Frontend' }],
    onSearchChange: vi.fn(),
    onColumnChange: vi.fn(),
    onIssueTypeChange: vi.fn(),
    onPriorityChange: vi.fn(),
    onAssigneeChange: vi.fn(),
    onLabelChange: vi.fn(),
    onReset: vi.fn(),
    sortBy: 'position' as const,
    sortOrder: 'asc' as const,
    onSortByChange: vi.fn(),
    onSortOrderChange: vi.fn(),
    ...overrides,
  };

  render(<BoardTaskFilters {...props} />);

  return props;
}

describe('BoardTaskFilters', () => {
  it('renders all filter controls', () => {
    renderFilters();

    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Issue type')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument();
    expect(screen.getByLabelText('Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
    expect(screen.getByLabelText('Order')).toBeInTheDocument();
  });

  it('emits search changes', () => {
    const props = renderFilters();

    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'authentication' },
    });

    expect(props.onSearchChange).toHaveBeenCalledWith('authentication');
  });

  it('emits typed filter changes', () => {
    const props = renderFilters();

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: '2' },
    });

    fireEvent.change(screen.getByLabelText('Issue type'), {
      target: { value: 'BUG' },
    });

    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'HIGH' },
    });

    fireEvent.change(screen.getByLabelText('Assignee'), {
      target: { value: 'UNASSIGNED' },
    });

    fireEvent.change(screen.getByLabelText('Label'), {
      target: { value: '8' },
    });

    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'priority' },
    });

    fireEvent.change(screen.getByLabelText('Order'), {
      target: { value: 'desc' },
    });

    expect(props.onColumnChange).toHaveBeenCalledWith(2);
    expect(props.onIssueTypeChange).toHaveBeenCalledWith('BUG');
    expect(props.onPriorityChange).toHaveBeenCalledWith('HIGH');
    expect(props.onAssigneeChange).toHaveBeenCalledWith('UNASSIGNED');
    expect(props.onLabelChange).toHaveBeenCalledWith(8);
    expect(props.onSortByChange).toHaveBeenCalledWith('priority');
    expect(props.onSortOrderChange).toHaveBeenCalledWith('desc');
  });

  it('allows resetting active filters', () => {
    const props = renderFilters({
      search: 'auth',
      priority: 'HIGH',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it('does not show reset button without filters', () => {
    renderFilters();

    expect(
      screen.queryByRole('button', { name: 'Reset filters' }),
    ).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateComment = vi.hoisted(() => vi.fn());
const mockDeleteComment = vi.hoisted(() => vi.fn());
const mockUpdateComment = vi.hoisted(() => vi.fn());
const mockUseComments = vi.hoisted(() => vi.fn());
const mockUseAppSelector = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/comments/use-create-comment', () => ({
  useCreateComment: () => ({
    mutateAsync: mockCreateComment,
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/comments/use-delete-comment', () => ({
  useDeleteComment: () => ({
    mutateAsync: mockDeleteComment,
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/comments/use-update-comment', () => ({
  useUpdateComment: () => ({
    mutateAsync: mockUpdateComment,
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/comments/use-comments', () => ({
  useComments: () => mockUseComments(),
}));

vi.mock('@/store/hooks', () => ({
  useAppSelector: (...args: unknown[]) => mockUseAppSelector(...args),
}));

import { CommentsSection } from '@/components/tasks/comments-section';

const comments = [
  {
    id: 1,
    taskId: 10,
    userId: 1,
    content: 'Initial comment',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    user: {
      id: 1,
      email: 'author@example.com',
    },
  },
  {
    id: 2,
    taskId: 10,
    userId: 2,
    content: 'Another comment',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    user: {
      id: 2,
      email: 'other@example.com',
    },
  },
];

const members = [
  {
    id: 1,
    role: 'OWNER' as const,
    createdAt: '2026-09-01T00:00:00.000Z',
    user: {
      id: 1,
      email: 'author@example.com',
    },
  },
];

describe('CommentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAppSelector.mockReturnValue({
      userId: 1,
      email: 'author@example.com',
    });

    mockUseComments.mockReturnValue({
      data: comments,
      isPending: false,
      isError: false,
    });

    mockCreateComment.mockResolvedValue({});
    mockDeleteComment.mockResolvedValue({});
    mockUpdateComment.mockResolvedValue({});
  });

  it('renders comments and the add form', () => {
    render(<CommentsSection taskId={10} members={members} />);

    expect(
      screen.getByRole('heading', { name: 'Comments' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Initial comment')).toBeInTheDocument();
    expect(screen.getByText('Another comment')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Write a comment...'),
    ).toBeInTheDocument();
  });

  it('does not submit an empty comment', () => {
    render(<CommentsSection taskId={10} members={members} />);

    expect(screen.getByRole('button', { name: 'Add comment' })).toBeDisabled();

    expect(mockCreateComment).not.toHaveBeenCalled();
  });

  it('creates a comment and clears the input', async () => {
    render(<CommentsSection taskId={10} members={members} />);

    const textarea = screen.getByPlaceholderText('Write a comment...');

    fireEvent.change(textarea, {
      target: { value: 'New comment' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));

    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith({
        content: 'New comment',
      });
    });

    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('allows the author to edit a comment', () => {
    render(<CommentsSection taskId={10} members={members} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    expect(screen.getByDisplayValue('Initial comment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('allows the author to delete a comment after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<CommentsSection taskId={10} members={members} />);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalledTimes(1);
    });
  });
});

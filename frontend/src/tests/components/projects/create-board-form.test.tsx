import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateBoard = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/projects/use-create-board', () => ({
  useCreateBoard: () => ({
    mutateAsync: mockCreateBoard,
    isError: false,
    isPending: false,
  }),
}));

import { CreateBoardForm } from '@/components/projects/create-board-form';

describe('CreateBoardForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateBoard.mockResolvedValue({ id: 10, name: 'Main Board' });
  });

  it('validates an empty board name', async () => {
    render(<CreateBoardForm projectId={20} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create board' }));

    expect(
      await screen.findByText('Board name is required'),
    ).toBeInTheDocument();

    expect(mockCreateBoard).not.toHaveBeenCalled();
  });

  it('creates a board and resets the form', async () => {
    render(<CreateBoardForm projectId={20} />);

    const input = screen.getByPlaceholderText('Main Board');

    fireEvent.change(input, {
      target: { value: 'Development Board' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create board' }));

    await waitFor(() => {
      expect(mockCreateBoard).toHaveBeenCalledWith({
        name: 'Development Board',
      });
    });

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });
});

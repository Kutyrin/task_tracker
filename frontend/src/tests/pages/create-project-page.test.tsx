import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.hoisted(() => vi.fn());
const mockCreateProject = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/components/auth/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/projects/use-create-project', () => ({
  useCreateProject: () => ({
    mutateAsync: mockCreateProject,
    isPending: false,
    isError: false,
  }),
}));

import CreateProjectPage from '@/app/projects/new/page';

describe('CreateProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateProject.mockResolvedValue({ id: 42 });
  });

  it('renders the project form', () => {
    render(<CreateProjectPage />);

    expect(
      screen.getByRole('heading', { name: 'Create project' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Project name')).toBeInTheDocument();
    expect(screen.getByText('Project key')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('validates required project fields', async () => {
    render(<CreateProjectPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(
      await screen.findByText('Project name is required'),
    ).toBeInTheDocument();

    expect(
      await screen.findByText('Project key must contain at least 2 characters'),
    ).toBeInTheDocument();

    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it('normalizes the project key and redirects after creation', async () => {
    render(<CreateProjectPage />);

    fireEvent.change(screen.getByPlaceholderText('Task Tracker'), {
      target: { value: 'My Project' },
    });

    fireEvent.change(screen.getByPlaceholderText('TASK'), {
      target: { value: 'ab-12' },
    });

    fireEvent.change(
      screen.getByPlaceholderText('Describe what this project is about.'),
      {
        target: { value: 'Project description' },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: 'My Project',
        key: 'AB12',
        description: 'Project description',
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/projects/42');
  });

  it('shows a server error when creation fails', async () => {
    mockCreateProject.mockRejectedValueOnce(new Error('Conflict'));

    render(<CreateProjectPage />);

    fireEvent.change(screen.getByPlaceholderText('Task Tracker'), {
      target: { value: 'My Project' },
    });

    fireEvent.change(screen.getByPlaceholderText('TASK'), {
      target: { value: 'TEST' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(
      await screen.findByText(
        'Failed to create project. The project key may already be in use.',
      ),
    ).toBeInTheDocument();
  });
});

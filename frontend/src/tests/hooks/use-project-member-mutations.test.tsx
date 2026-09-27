import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAddProjectMember = vi.hoisted(() => vi.fn());
const mockRemoveProjectMember = vi.hoisted(() => vi.fn());
const mockUpdateProjectMemberRole = vi.hoisted(() => vi.fn());

vi.mock('@/lib/projects', () => ({
  addProjectMember: (...args: unknown[]) => mockAddProjectMember(...args),
  removeProjectMember: (...args: unknown[]) => mockRemoveProjectMember(...args),
  updateProjectMemberRole: (...args: unknown[]) =>
    mockUpdateProjectMemberRole(...args),
}));

import { useAddProjectMember } from '@/hooks/projects/use-add-project-member';
import { useRemoveProjectMember } from '@/hooks/projects/use-remove-project-member';
import { useUpdateProjectMemberRole } from '@/hooks/projects/use-update-project-member-role';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
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

function expectProjectInvalidations(
  invalidateQueriesSpy: ReturnType<typeof vi.spyOn>,
) {
  expect(invalidateQueriesSpy).toHaveBeenCalledWith({
    queryKey: ['projects', 10, 'members'],
  });

  expect(invalidateQueriesSpy).toHaveBeenCalledWith({
    queryKey: ['projects', 10],
  });

  expect(invalidateQueriesSpy).toHaveBeenCalledWith({
    queryKey: ['projects'],
  });
}

describe('project member mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a project member and invalidates related project queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const payload = {
      email: 'member@example.com',
      role: 'MEMBER' as const,
    };

    mockAddProjectMember.mockResolvedValue({
      id: 7,
      role: 'MEMBER',
      createdAt: '2026-09-10T00:00:00.000Z',
      user: {
        id: 50,
        email: payload.email,
      },
    });

    const { result } = renderHook(() => useAddProjectMember(10), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(payload);

    expect(mockAddProjectMember).toHaveBeenCalledWith(10, payload);
    expectProjectInvalidations(invalidateQueriesSpy);
  });

  it('propagates add member errors without invalidating queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockAddProjectMember.mockRejectedValue(new Error('Add member failed'));

    const { result } = renderHook(() => useAddProjectMember(10), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        email: 'member@example.com',
        role: 'MEMBER',
      }),
    ).rejects.toThrow('Add member failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('removes a project member and invalidates related project queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockRemoveProjectMember.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemoveProjectMember(10), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(7);

    expect(mockRemoveProjectMember).toHaveBeenCalledWith(10, 7);
    expectProjectInvalidations(invalidateQueriesSpy);
  });

  it('propagates remove member errors without invalidating queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockRemoveProjectMember.mockRejectedValue(
      new Error('Remove member failed'),
    );

    const { result } = renderHook(() => useRemoveProjectMember(10), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync(7)).rejects.toThrow(
      'Remove member failed',
    );

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('updates a project member role and invalidates related project queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockUpdateProjectMemberRole.mockResolvedValue({
      id: 7,
      role: 'ADMIN',
      createdAt: '2026-09-10T00:00:00.000Z',
      user: {
        id: 50,
        email: 'member@example.com',
      },
    });

    const { result } = renderHook(() => useUpdateProjectMemberRole(10), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      memberId: 7,
      role: 'ADMIN',
    });

    expect(mockUpdateProjectMemberRole).toHaveBeenCalledWith(10, 7, {
      role: 'ADMIN',
    });

    expectProjectInvalidations(invalidateQueriesSpy);
  });

  it('propagates role update errors without invalidating queries', async () => {
    const queryClient = createQueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    mockUpdateProjectMemberRole.mockRejectedValue(
      new Error('Update role failed'),
    );

    const { result } = renderHook(() => useUpdateProjectMemberRole(10), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        memberId: 7,
        role: 'ADMIN',
      }),
    ).rejects.toThrow('Update role failed');

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});

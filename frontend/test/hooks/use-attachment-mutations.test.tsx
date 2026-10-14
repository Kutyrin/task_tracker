import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUploadAttachment = vi.hoisted(() => vi.fn());
const mockDeleteAttachment = vi.hoisted(() => vi.fn());

vi.mock('@/lib/attachments', () => ({
  uploadAttachment: (...args: unknown[]) => mockUploadAttachment(...args),
  deleteAttachment: (...args: unknown[]) => mockDeleteAttachment(...args),
}));

import { useDeleteAttachment } from '@/hooks/attachments/use-delete-attachment';
import { useUploadAttachment } from '@/hooks/attachments/use-upload-attachment';

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

describe('attachment mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads an attachment and prepends it to the task cache', async () => {
    const queryClient = createQueryClient();

    const existingAttachment = {
      id: 1,
      filename: 'old.txt',
    };

    const uploadedAttachment = {
      id: 2,
      filename: 'new.txt',
    };

    queryClient.setQueryData(['attachments', 42], [existingAttachment]);

    mockUploadAttachment.mockResolvedValue(uploadedAttachment);

    const { result } = renderHook(() => useUploadAttachment(42), {
      wrapper: createWrapper(queryClient),
    });

    const file = new File(['content'], 'new.txt', {
      type: 'text/plain',
    });

    await result.current.mutateAsync(file);

    expect(mockUploadAttachment).toHaveBeenCalledTimes(1);
    expect(mockUploadAttachment).toHaveBeenCalledWith(42, file);

    expect(queryClient.getQueryData(['attachments', 42])).toEqual([
      uploadedAttachment,
      existingAttachment,
    ]);
  });

  it('does not duplicate an uploaded attachment already present in cache', async () => {
    const queryClient = createQueryClient();

    const existingAttachment = {
      id: 2,
      filename: 'existing.txt',
    };

    queryClient.setQueryData(['attachments', 42], [existingAttachment]);

    mockUploadAttachment.mockResolvedValue(existingAttachment);

    const { result } = renderHook(() => useUploadAttachment(42), {
      wrapper: createWrapper(queryClient),
    });

    const file = new File(['content'], 'existing.txt', {
      type: 'text/plain',
    });

    await result.current.mutateAsync(file);

    expect(queryClient.getQueryData(['attachments', 42])).toEqual([
      existingAttachment,
    ]);
  });

  it('removes a deleted attachment from the task cache', async () => {
    const queryClient = createQueryClient();

    const attachments = [
      {
        id: 1,
        filename: 'keep.txt',
      },
      {
        id: 2,
        filename: 'remove.txt',
      },
    ];

    queryClient.setQueryData(['attachments', 42], attachments);
    mockDeleteAttachment.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteAttachment(42, 2), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync();

    expect(mockDeleteAttachment).toHaveBeenCalledTimes(1);
    expect(mockDeleteAttachment).toHaveBeenCalledWith(42, 2);

    expect(queryClient.getQueryData(['attachments', 42])).toEqual([
      attachments[0],
    ]);
  });

  it('keeps the attachment cache unchanged when deletion fails', async () => {
    const queryClient = createQueryClient();

    const attachments = [
      {
        id: 1,
        filename: 'keep.txt',
      },
      {
        id: 2,
        filename: 'remove.txt',
      },
    ];

    queryClient.setQueryData(['attachments', 42], attachments);
    mockDeleteAttachment.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useDeleteAttachment(42, 2), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow('Delete failed');

    expect(queryClient.getQueryData(['attachments', 42])).toEqual(attachments);
  });
});

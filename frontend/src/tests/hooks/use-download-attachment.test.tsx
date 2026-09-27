import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDownloadAttachment = vi.hoisted(() => vi.fn());

vi.mock('@/lib/attachments', () => ({
  downloadAttachment: (...args: unknown[]) => mockDownloadAttachment(...args),
}));

import { useDownloadAttachment } from '@/hooks/attachments/use-download-attachment';

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

describe('useDownloadAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes task and attachment ids to downloadAttachment', async () => {
    const queryClient = createQueryClient();
    const downloadedFile = new Blob(['file content']);

    mockDownloadAttachment.mockResolvedValue(downloadedFile);

    const { result } = renderHook(() => useDownloadAttachment(42, 7), {
      wrapper: createWrapper(queryClient),
    });

    const response = await result.current.mutateAsync();

    expect(mockDownloadAttachment).toHaveBeenCalledTimes(1);
    expect(mockDownloadAttachment).toHaveBeenCalledWith(42, 7);
    expect(response).toBe(downloadedFile);
  });

  it('propagates download errors', async () => {
    const queryClient = createQueryClient();

    mockDownloadAttachment.mockRejectedValue(new Error('Download failed'));

    const { result } = renderHook(() => useDownloadAttachment(42, 7), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow(
      'Download failed',
    );
  });
});

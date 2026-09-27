import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAttachments = vi.hoisted(() => vi.fn());
const mockUpload = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockDownload = vi.hoisted(() => vi.fn());
const mockUseAppSelector = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/attachments/use-attachments', () => ({
  useAttachments: () => mockUseAttachments(),
}));

vi.mock('@/hooks/attachments/use-upload-attachment', () => ({
  useUploadAttachment: () => ({
    mutateAsync: mockUpload,
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/attachments/use-delete-attachment', () => ({
  useDeleteAttachment: () => ({
    mutateAsync: mockDelete,
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/attachments/use-download-attachment', () => ({
  useDownloadAttachment: () => ({
    mutateAsync: mockDownload,
    isPending: false,
  }),
}));

vi.mock('@/store/hooks', () => ({
  useAppSelector: (...args: unknown[]) => mockUseAppSelector(...args),
}));

import { AttachmentsSection } from '@/components/tasks/attachments-section';

const attachment = {
  id: 1,
  filename: 'notes.txt',
  mimeType: 'text/plain',
  size: 1024,
  url: '/attachments/1/download',
  createdAt: '2026-09-01T10:00:00.000Z',
  user: {
    id: 1,
    email: 'user@example.com',
  },
};

const ownerMember = {
  id: 1,
  role: 'OWNER' as const,
  createdAt: '2026-09-01T00:00:00.000Z',
  user: {
    id: 1,
    email: 'user@example.com',
  },
};

describe('AttachmentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAppSelector.mockReturnValue({
      userId: 1,
      email: 'user@example.com',
    });

    mockUseAttachments.mockReturnValue({
      data: [attachment],
      isPending: false,
      isError: false,
    });

    mockUpload.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
    mockDownload.mockResolvedValue(new Blob(['test']));
  });

  it('renders attachments', () => {
    render(<AttachmentsSection taskId={10} members={[ownerMember]} />);

    expect(
      screen.getByRole('heading', { name: 'Attachments' }),
    ).toBeInTheDocument();
    expect(screen.getByText('notes.txt')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('rejects files larger than 5 MB', () => {
    const { container } = render(
      <AttachmentsSection taskId={10} members={[ownerMember]} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const file = new File(['x'], 'large.txt', {
      type: 'text/plain',
    });

    Object.defineProperty(file, 'size', {
      value: 6 * 1024 * 1024,
    });

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(
      screen.getByText('File size must not exceed 5 MB.'),
    ).toBeInTheDocument();
  });

  it('rejects unsupported file types', () => {
    const { container } = render(
      <AttachmentsSection taskId={10} members={[ownerMember]} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const file = new File(['x'], 'script.js', {
      type: 'application/javascript',
    });

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(screen.getByText('Unsupported file type.')).toBeInTheDocument();
  });

  it('uploads a valid file', async () => {
    const { container } = render(
      <AttachmentsSection taskId={10} members={[ownerMember]} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const file = new File(['hello'], 'new-notes.txt', {
      type: 'text/plain',
    });

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(screen.getByText(/Selected: new-notes\.txt/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(file);
    });
  });

  it('deletes an attachment after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AttachmentsSection taskId={10} members={[ownerMember]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });
  });
});

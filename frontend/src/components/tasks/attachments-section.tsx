'use client';

import { useRef, useState } from 'react';

import { useDeleteAttachment } from '@/hooks/attachments/use-delete-attachment';
import { useAttachments } from '@/hooks/attachments/use-attachments';
import { useUploadAttachment } from '@/hooks/attachments/use-upload-attachment';
import type { ProjectMember } from '@/lib/projects';
import { useAppSelector } from '@/store/hooks';
import { useDownloadAttachment } from '@/hooks/attachments/use-download-attachment';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAttachmentDate(value: string) {
  return new Date(value).toLocaleString();
}

interface AttachmentsSectionProps {
  taskId: number;
  members: ProjectMember[];
}

export function AttachmentsSection({
  taskId,
  members,
}: AttachmentsSectionProps) {
  const currentUser = useAppSelector((state) => state.auth.user);

  const { data: attachments, isPending, isError } = useAttachments(taskId);

  const uploadMutation = useUploadAttachment(taskId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentMember =
    members.find((member) => member.user.id === currentUser?.userId) ?? null;

  const canDeleteOthers =
    currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setValidationError(null);
    setSelectedFile(null);

    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError('File size must not exceed 5 MB.');
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setValidationError('Unsupported file type.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    try {
      await uploadMutation.mutateAsync(selectedFile);

      setSelectedFile(null);
      setValidationError(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      return;
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Attachments</h2>

        <p className="mt-1 text-sm text-slate-500">
          Files attached to this issue.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        {selectedFile && (
          <p className="mt-2 text-xs text-slate-500">
            Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </p>
        )}

        {validationError && (
          <p className="mt-2 text-sm text-red-600">{validationError}</p>
        )}

        {uploadMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            Failed to upload attachment.
          </p>
        )}

        <p className="mt-2 text-xs text-slate-400">
          Maximum 5 MB. JPG, PNG, GIF, WebP, PDF or TXT.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {isPending && (
          <p className="text-sm text-slate-500">Loading attachments...</p>
        )}

        {isError && (
          <p className="text-sm text-red-600">Failed to load attachments.</p>
        )}

        {!isPending && !isError && attachments?.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No attachments yet.
          </p>
        )}

        {attachments?.map((attachment) => {
          const isAuthor = attachment.user.id === currentUser?.userId;

          const canDelete = isAuthor || canDeleteOthers;

          const href = `${API_URL}${attachment.url}`;

          return (
            <AttachmentItem
              key={attachment.id}
              taskId={taskId}
              attachment={attachment}
              href={href}
              canDelete={canDelete}
            />
          );
        })}
      </div>
    </section>
  );
}

function AttachmentItem({
  taskId,
  attachment,
  canDelete,
}: {
  taskId: number;
  attachment: {
    id: number;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
    createdAt: string;
    user: {
      id: number;
      email: string;
    };
  };
  href: string;
  canDelete: boolean;
}) {
  const deleteMutation = useDeleteAttachment(taskId, attachment.id);
  const downloadMutation = useDownloadAttachment(taskId, attachment.id);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${attachment.filename}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync();
    } catch {
      return;
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await downloadMutation.mutateAsync();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = attachment.filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch {
      return;
    }
  };

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex shrink items-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloadMutation.isPending}
          className="text-sm font-medium text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloadMutation.isPending ? 'Downloading...' : 'Download'}
        </button>
        <p className="truncate text-sm font-medium text-slate-950">
          {attachment.filename}
        </p>

        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
          <span>{formatFileSize(attachment.size)}</span>
          <span>·</span>
          <span>{attachment.user.email}</span>
          <span>·</span>
          <span>{formatAttachmentDate(attachment.createdAt)}</span>
        </div>

        {deleteMutation.isError && (
          <p className="mt-2 text-xs text-red-600">
            Failed to delete attachment.
          </p>
        )}
      </div>

      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="text-sm font-medium text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        </button>
      )}
    </article>
  );
}

'use client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

import { useState } from 'react';

import { useCreateComment } from '@/hooks/comments/use-create-comment';
import { useDeleteComment } from '@/hooks/comments/use-delete-comment';
import { useUpdateComment } from '@/hooks/comments/use-update-comment';
import { useComments } from '@/hooks/comments/use-comments';
import type { Comment } from '@/lib/comments';
import type { ProjectMember } from '@/lib/projects';
import { useAppSelector } from '@/store/hooks';

interface CommentsSectionProps {
  taskId: number;
  members: ProjectMember[];
}

function formatCommentDate(value: string) {
  return new Date(value).toLocaleString();
}

function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  onEdit,
}: {
  comment: Comment;
  currentUserId: number | null;
  currentUserRole: ProjectMember['role'] | null;
  onEdit: (comment: Comment) => void;
}) {
  const deleteCommentMutation = useDeleteComment(comment.taskId, comment.id);

  const isAuthor = currentUserId === comment.userId;

  const canDelete =
    isAuthor || currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Delete this comment? This action cannot be undone.',
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCommentMutation.mutateAsync();
    } catch {
      return;
    }
  };

  return (
    <article className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {comment.user.email}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {formatCommentDate(comment.createdAt)}
            {comment.updatedAt !== comment.createdAt && ' · Edited'}
          </p>
        </div>

        {(isAuthor || canDelete) && (
          <div className="flex gap-2">
            {isAuthor && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onEdit(comment)}
              >
                Edit
              </Button>
            )}

            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                type="button"
                onClick={handleDelete}
                disabled={deleteCommentMutation.isPending}
              >
                {deleteCommentMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
        {comment.content}
      </p>

      {deleteCommentMutation.isError && (
        <p className="mt-2 text-xs text-destructive">Failed to delete comment.</p>
      )}
    </article>
  );
}

function EditCommentForm({
  comment,
  onCancel,
}: {
  comment: Comment;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(comment.content);
  const updateCommentMutation = useUpdateComment(comment.taskId, comment.id);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || trimmedContent.length > 5000) {
      return;
    }

    try {
      await updateCommentMutation.mutateAsync({
        content: trimmedContent,
      });

      onCancel();
    } catch {
      return;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-muted/40 p-4"
    >
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={5000}
        rows={4}
        className="w-full"
      />

      <div className="mt-3 flex flex-wrap gap-3">
        <Button
          variant="default"
          type="submit"
          disabled={updateCommentMutation.isPending || !content.trim()}
        >
          {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
        </Button>

        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {updateCommentMutation.isError && (
        <p className="mt-2 text-sm text-destructive">Failed to update comment.</p>
      )}
    </form>
  );
}

export function CommentsSection({ taskId, members }: CommentsSectionProps) {
  const currentUser = useAppSelector((state) => state.auth.user);

  const { data: comments, isPending, isError } = useComments(taskId);

  const createCommentMutation = useCreateComment(taskId);

  const [content, setContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);

  const currentMember =
    members.find((member) => member.user.id === currentUser?.userId) ?? null;

  const currentUserRole = currentMember?.role ?? null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || trimmedContent.length > 5000) {
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        content: trimmedContent,
      });

      setContent('');
    } catch {
      return;
    }
  };

  return (
    <Card asChild>
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Comments</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Discuss the issue with your project members.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={5000}
            rows={4}
            placeholder="Write a comment..."
            className="w-full"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {content.length}/5000
            </span>

            <Button
              variant="default"
              type="submit"
              disabled={createCommentMutation.isPending || !content.trim()}
            >
              {createCommentMutation.isPending ? 'Posting...' : 'Add comment'}
            </Button>
          </div>

          {createCommentMutation.isError && (
            <p className="mt-2 text-sm text-destructive">Failed to add comment.</p>
          )}
        </form>

        <div className="mt-6 space-y-3">
          {isPending && (
            <p className="text-sm text-muted-foreground">Loading comments...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">Failed to load comments.</p>
          )}

          {!isPending && !isError && comments?.length === 0 && (
            <p className="rounded-xl border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">
              No comments yet.
            </p>
          )}

          {comments?.map((comment) =>
            editingCommentId === comment.id ? (
              <EditCommentForm
                key={comment.id}
                comment={comment}
                onCancel={() => setEditingCommentId(null)}
              />
            ) : (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUser?.userId ?? null}
                currentUserRole={currentUserRole}
                onEdit={() => setEditingCommentId(comment.id)}
              />
            ),
          )}
        </div>
      </section>
    </Card>
  );
}

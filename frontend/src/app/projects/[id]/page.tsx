'use client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useProject } from '@/hooks/projects/use-project';
import { useDeleteProject } from '@/hooks/projects/use-delete-project';
import { ProjectLabels } from '@/components/projects/project-labels';
import { useProjectRealtime } from '@/hooks/realtime/use-project-realtime';
import { ProjectMembers } from '@/components/projects/project-members';
import { useProjectMembers } from '@/hooks/projects/use-project-members';
import { AddProjectMemberForm } from '@/components/projects/add-project-member-form';
import { ProjectBoards } from '@/components/projects/project-boards';
import { useProjectBoards } from '@/hooks/projects/use-project-boards';
import { CreateBoardForm } from '@/components/projects/create-board-form';
import { ProjectActivitySection } from '@/components/projects/project-activity-section';

function ProjectContent({ projectId }: { projectId: number }) {
  const router = useRouter();
  const deleteProjectMutation = useDeleteProject();

  const { data: project, isPending, isError } = useProject(projectId);
  const {
    data: members,
    isPending: isMembersPending,
    isError: isMembersError,
  } = useProjectMembers(projectId);
  const {
    data: boards,
    isPending: isBoardsPending,
    isError: isBoardsError,
  } = useProjectBoards(projectId);

  useProjectRealtime(projectId);

  if (isPending) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-muted-foreground">Loading project...</p>
        </div>
      </main>
    );
  }

  if (isError || !project) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <Button asChild variant="outline">
            <Link href="/projects">Back to projects</Link>
          </Button>

          <div className="mt-8 rounded-2xl border border-destructive/25 bg-destructive/10 p-6">
            <h1 className="text-lg font-semibold text-destructive">
              Project not found
            </h1>

            <p className="mt-2 text-sm text-destructive">
              The project may not exist or you may not have access to it.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const handleDeleteProject = async () => {
    const confirmed = window.confirm(
      `Delete project "${project.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteProjectMutation.mutateAsync(projectId);
      router.replace('/projects');
    } catch {
      return;
    }
  };

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>
        <div className="mt-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold tracking-wide text-muted-foreground">
                {project.key}
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {project.name}
              </h1>

              <p className="mt-2 text-muted-foreground">
                {project.description || 'No project description.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary">{project.role}</Badge>

              {project.role === 'OWNER' && (
                <Button
                  variant="destructive"
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={deleteProjectMutation.isPending}
                >
                  {deleteProjectMutation.isPending
                    ? 'Deleting...'
                    : 'Delete project'}
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Card asChild>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Tasks</p>

              <p className="mt-2 text-3xl font-semibold text-foreground">
                {project.taskCount}
              </p>
            </div>
          </Card>

          <Card asChild>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Members</p>

              <p className="mt-2 text-3xl font-semibold text-foreground">
                {project.memberCount}
              </p>
            </div>
          </Card>
        </div>
        <Card asChild>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">
              Project information
            </h2>

            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Project ID</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {project.id}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Owner ID</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {project.ownerId}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Your role</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {project.role}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Created</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {new Date(project.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </Card>
        {/* Members */}
        <Card asChild>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Members
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  People who have access to this project.
                </p>
              </div>

              <Badge variant="secondary">{project.memberCount}</Badge>
            </div>

            <div className="mt-5">
              {isMembersPending && (
                <p className="text-sm text-muted-foreground">
                  Loading members...
                </p>
              )}

              {isMembersError && (
                <p className="text-sm text-destructive">Failed to load members.</p>
              )}

              {members && members.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No members found.
                </p>
              )}

              {members && members.length > 0 && (
                <ProjectMembers
                  projectId={projectId}
                  currentRole={project.role}
                  members={members}
                />
              )}

              {(project.role === 'OWNER' || project.role === 'ADMIN') && (
                <AddProjectMemberForm
                  projectId={projectId}
                  currentRole={project.role}
                />
              )}
            </div>
          </div>
        </Card>
        {/* Labels */}
        {(project.role === 'OWNER' || project.role === 'ADMIN') && (
          <ProjectLabels projectId={projectId} />
        )}
        {/* Boards */}
        <Card asChild>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Boards
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Kanban boards for this project.
                </p>
              </div>

              <Badge variant="secondary">{boards?.length ?? 0}</Badge>
            </div>

            <div className="mt-5">
              {isBoardsPending && (
                <p className="text-sm text-muted-foreground">
                  Loading boards...
                </p>
              )}

              {isBoardsError && (
                <p className="text-sm text-destructive">Failed to load boards.</p>
              )}

              {boards && boards.length === 0 && (
                <div className="rounded-xl border border-dashed border-input p-8 text-center">
                  <h3 className="text-sm font-semibold text-foreground">
                    No boards yet
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Create a board to start organizing issues.
                  </p>
                </div>
              )}

              {boards && boards.length > 0 && <ProjectBoards boards={boards} />}
              {(project.role === 'OWNER' || project.role === 'ADMIN') && (
                <CreateBoardForm projectId={projectId} />
              )}
            </div>
          </div>
        </Card>
        {/* Project activity */}
        <div>
          <ProjectActivitySection projectId={projectId} />
        </div>
      </div>
    </main>
  );
}

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm text-destructive">Invalid project ID.</p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <ProjectContent projectId={projectId} />
    </ProtectedRoute>
  );
}

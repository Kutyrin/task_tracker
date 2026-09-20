'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useProject } from '@/hooks/projects/use-project';
import { ProjectLabels } from '@/components/projects/project-labels';
import { useProjectRealtime } from '@/hooks/realtime/use-project-realtime';
import { ProjectMembers } from '@/components/projects/project-members';
import { useProjectMembers } from '@/hooks/projects/use-project-members';
import { AddProjectMemberForm } from '@/components/projects/add-project-member-form';
import { ProjectBoards } from '@/components/projects/project-boards';
import { useProjectBoards } from '@/hooks/projects/use-project-boards';
import { CreateBoardForm } from '@/components/projects/create-board-form';

function ProjectContent({ projectId }: { projectId: number }) {
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
          <p className="text-sm text-slate-500">Loading project...</p>
        </div>
      </main>
    );
  }

  if (isError || !project) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/projects"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to projects
          </Link>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-900">
              Project not found
            </h1>

            <p className="mt-2 text-sm text-red-700">
              The project may not exist or you may not have access to it.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/projects"
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to projects
        </Link>
        <div className="mt-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-500">
                {project.key}
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {project.name}
              </h1>

              <p className="mt-2 text-slate-600">
                {project.description || 'No project description.'}
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              {project.role}
            </span>
          </div>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Tasks</p>

            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {project.taskCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Members</p>

            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {project.memberCount}
            </p>
          </div>
        </div>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Project information
          </h2>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Project ID</dt>
              <dd className="mt-1 font-medium text-slate-950">{project.id}</dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Owner ID</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {project.ownerId}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Your role</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {project.role}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Created</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {new Date(project.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
        {/* Members */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Members</h2>

              <p className="mt-1 text-sm text-slate-600">
                People who have access to this project.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {project.memberCount}
            </span>
          </div>

          <div className="mt-5">
            {isMembersPending && (
              <p className="text-sm text-slate-500">Loading members...</p>
            )}

            {isMembersError && (
              <p className="text-sm text-red-600">Failed to load members.</p>
            )}

            {members && members.length === 0 && (
              <p className="text-sm text-slate-500">No members found.</p>
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
        {/* Labels */}
        {(project.role === 'OWNER' || project.role === 'ADMIN') && (
          <ProjectLabels projectId={projectId} />
        )}
        {/* Boards */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Boards</h2>

              <p className="mt-1 text-sm text-slate-600">
                Kanban boards for this project.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {boards?.length ?? 0}
            </span>
          </div>

          <div className="mt-5">
            {isBoardsPending && (
              <p className="text-sm text-slate-500">Loading boards...</p>
            )}

            {isBoardsError && (
              <p className="text-sm text-red-600">Failed to load boards.</p>
            )}

            {boards && boards.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <h3 className="text-sm font-semibold text-slate-950">
                  No boards yet
                </h3>

                <p className="mt-1 text-sm text-slate-500">
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
            <p className="text-sm text-red-600">Invalid project ID.</p>
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

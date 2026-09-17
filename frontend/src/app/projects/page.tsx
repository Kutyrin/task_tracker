'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ProjectCard } from '@/components/projects/project-card';
import { useProjects } from '@/hooks/projects/use-projects';
import { LogoutButton } from '@/components/auth/logout-button';

function ProjectsContent() {
  const { data: projects, isPending, isError } = useProjects();

  if (isPending) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-slate-500">Loading projects...</p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-red-600">Failed to load projects.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-row justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Task Tracker</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Projects
            </h1>

            <p className="mt-2 text-slate-600">Your projects and workspaces.</p>
          </div>
          <div>
            <LogoutButton />
          </div>
        </div>

        <Link
          href="/projects/new"
          className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Create project
        </Link>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <h2 className="text-lg font-semibold text-slate-950">
              No projects yet
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Create your first project to get started.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <ProjectsContent />
    </ProtectedRoute>
  );
}

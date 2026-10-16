'use client';
import { Button } from '@/components/ui/button';

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
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-destructive">Failed to load projects.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-row justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Task Tracker
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Projects
            </h1>

            <p className="mt-2 text-muted-foreground">
              Your projects and workspaces.
            </p>
          </div>
          <div>
            <LogoutButton />
          </div>
        </div>

        <div className="mt-4">
          <Button asChild variant="default">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>

        <div className="mt-4">
          <Button asChild variant="default">
            <Link href="/projects/new">Create project</Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-input p-10 text-center">
            <h2 className="text-lg font-semibold text-foreground">
              No projects yet
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
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

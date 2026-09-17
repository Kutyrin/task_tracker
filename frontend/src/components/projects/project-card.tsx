import Link from 'next/link';

import type { Project } from '@/lib/projects';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500">
            {project.key}
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            {project.name}
          </h2>
        </div>

        {project.role && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {project.role}
          </span>
        )}
      </div>

      {project.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
          {project.description}
        </p>
      )}

      <div className="mt-5 flex gap-5 text-sm text-slate-500">
        <span>{project.taskCount} tasks</span>
        <span>{project.memberCount} members</span>
      </div>
    </Link>
  );
}

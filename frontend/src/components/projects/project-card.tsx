import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

import type { Project } from '@/lib/projects';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card asChild>
      <Link
        href={`/projects/${project.id}`}
        className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-input hover:shadow"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">
              {project.key}
            </p>

            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {project.name}
            </h2>
          </div>

          {project.role && <Badge variant="secondary">{project.role}</Badge>}
        </div>

        {project.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {project.description}
          </p>
        )}

        <div className="mt-5 flex gap-5 text-sm text-muted-foreground">
          <span>{project.taskCount} tasks</span>
          <span>{project.memberCount} members</span>
        </div>
      </Link>
    </Card>
  );
}

'use client';
import { Card } from '@/components/ui/card';

import Link from 'next/link';

import { useProjectActivities } from '@/hooks/activities/use-project-activities';

function formatActivityDate(value: string) {
  return new Date(value).toLocaleString();
}

export function ProjectActivitySection({ projectId }: { projectId: number }) {
  const {
    data: activities,
    isPending,
    isError,
  } = useProjectActivities(projectId);

  return (
    <Card asChild>
      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Activity</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            History of actions across this project.
          </p>
        </div>

        <div className="mt-6 max-h-128 overflow-y-auto pr-2">
          {isPending && (
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">Failed to load activity.</p>
          )}

          {!isPending && !isError && activities?.length === 0 && (
            <p className="rounded-xl border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">
              No activity yet.
            </p>
          )}

          {!isPending && !isError && activities && activities.length > 0 && (
            <div className="space-y-4">
              {activities.map((activity) => (
                <article
                  key={activity.id}
                  className="flex gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {activity.user.email.slice(0, 1).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium text-foreground">
                        {activity.user.email}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {formatActivityDate(activity.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {activity.message}
                    </p>

                    {activity.task && (
                      <Link
                        href={`/tasks/${activity.task.id}`}
                        className="mt-1 inline-block text-xs font-medium text-foreground transition hover:text-foreground"
                      >
                        {activity.task.project?.key
                          ? `${activity.task.project.key}-${activity.task.issueNumber}`
                          : activity.task.title}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </Card>
  );
}

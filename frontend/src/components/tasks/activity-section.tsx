'use client';
import { Card } from '@/components/ui/card';

import { useActivities } from '@/hooks/activities/use-activities';

interface ActivitySectionProps {
  taskId: number;
}

function formatActivityDate(value: string) {
  return new Date(value).toLocaleString();
}

export function ActivitySection({ taskId }: ActivitySectionProps) {
  const { data: activities, isPending, isError } = useActivities(taskId);

  return (
    <Card asChild>
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Activity</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            History of changes and actions on this issue.
          </p>
        </div>

        <div className="mt-6 max-h-100 overflow-y-auto scroll-smooth pr-2">
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

                  <div className="min-w-0">
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

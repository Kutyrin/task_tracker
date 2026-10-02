'use client';

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
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Activity</h2>

        <p className="mt-1 text-sm text-slate-500">
          History of changes and actions on this issue.
        </p>
      </div>

      <div className="mt-6 max-h-100 overflow-y-auto scroll-smooth pr-2">
        {isPending && (
          <p className="text-sm text-slate-500">Loading activity...</p>
        )}

        {isError && (
          <p className="text-sm text-red-600">Failed to load activity.</p>
        )}

        {!isPending && !isError && activities?.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No activity yet.
          </p>
        )}

        {!isPending && !isError && activities && activities.length > 0 && (
          <div className="space-y-4">
            {activities.map((activity) => (
              <article
                key={activity.id}
                className="flex gap-3 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0"
              >
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {activity.user.email.slice(0, 1).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-slate-950">
                      {activity.user.email}
                    </span>

                    <span className="text-xs text-slate-400">
                      {formatActivityDate(activity.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {activity.message}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

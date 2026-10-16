'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import Link from 'next/link';
import { useMemo } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useProjects } from '@/hooks/projects/use-projects';
import { useDashboardStats } from '@/hooks/projects/use-dashboard-stats';
import { useDashboardRealtime } from '@/hooks/realtime/use-dashboard-realtime';
import type { IssueType, TaskPriority } from '@/lib/tasks';
import { useAppSelector } from '@/store/hooks';

const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const issueTypeLabels: Record<IssueType, string> = {
  TASK: 'Task',
  BUG: 'Bug',
  STORY: 'Story',
  EPIC: 'Epic',
};

function DistributionList({
  items,
}: {
  items: {
    label: string;
    count: number;
  }[];
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  if (items.length === 0 || total === 0) {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-foreground">{item.label}</span>

            <span className="font-semibold text-foreground">{item.count}</span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${(item.count / maxCount) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardContent() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: projects } = useProjects();
  const { data: stats, isPending, isError } = useDashboardStats();

  const projectIds = useMemo(
    () => projects?.map((project) => project.id) ?? [],
    [projects],
  );

  useDashboardRealtime(projectIds);

  if (isPending) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div
            role="status"
            aria-label="Loading dashboard"
            className="space-y-6"
          >
            <p className="text-sm text-muted-foreground">
              Loading dashboard...
            </p>
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              aria-hidden="true"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-28 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError || !stats) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-6">
            <h1 className="text-lg font-semibold text-destructive">
              Failed to load dashboard
            </h1>

            <p className="mt-2 text-sm text-destructive">
              Statistics could not be loaded.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div className="min-w-0 w-full">
            <p className="text-sm font-medium text-muted-foreground">
              Task Tracker
            </p>

            <h1 className="mt-2 wrap-anywhere text-3xl font-semibold tracking-tight text-foreground">
              Welcome, {user?.email}
            </h1>

            <p className="mt-2 text-muted-foreground">
              Overview of your projects and tasks.
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="default">
            <Link href="/projects">View projects</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/calendar">Open calendar</Link>
          </Button>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Card asChild>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">
                Projects
              </p>

              <p className="mt-3 text-3xl font-semibold text-foreground">
                {stats.totalProjects}
              </p>
            </div>
          </Card>

          <Card asChild>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Tasks</p>

              <p className="mt-3 text-3xl font-semibold text-foreground">
                {stats.totalTasks}
              </p>
            </div>
          </Card>

          <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-5 shadow-sm">
            <p className="text-sm font-medium text-destructive">Overdue</p>

            <p className="mt-3 text-3xl font-semibold text-destructive">
              {stats.overdueTasks}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card asChild>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                By status
              </h2>

              <div className="mt-6">
                <DistributionList
                  items={stats.byColumn.map((item) => ({
                    label: item.columnName ?? 'No status',
                    count: item.count,
                  }))}
                />
              </div>
            </div>
          </Card>

          <Card asChild>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                By priority
              </h2>

              <div className="mt-6">
                <DistributionList
                  items={(['LOW', 'MEDIUM', 'HIGH'] as TaskPriority[]).map(
                    (priority) => ({
                      label: priorityLabels[priority],
                      count:
                        stats.byPriority.find(
                          (item) => item.priority === priority,
                        )?.count ?? 0,
                    }),
                  )}
                />
              </div>
            </div>
          </Card>

          <Card asChild>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                By issue type
              </h2>

              <div className="mt-6">
                <DistributionList
                  items={(['TASK', 'BUG', 'STORY', 'EPIC'] as IssueType[]).map(
                    (issueType) => ({
                      label: issueTypeLabels[issueType],
                      count:
                        stats.byIssueType.find(
                          (item) => item.issueType === issueType,
                        )?.count ?? 0,
                    }),
                  )}
                />
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

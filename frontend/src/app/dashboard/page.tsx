'use client';

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
    return <p className="text-sm text-slate-500">No data available.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>

            <span className="font-semibold text-slate-950">{item.count}</span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-800"
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
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (isError || !stats) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-900">
              Failed to load dashboard
            </h1>

            <p className="mt-2 text-sm text-red-700">
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
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-slate-500">Task Tracker</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Welcome, {user?.email}
            </h1>

            <p className="mt-2 text-slate-600">
              Overview of your projects and tasks.
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-8">
          <Link
            href="/projects"
            className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            View projects
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Projects</p>

            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {stats.totalProjects}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Tasks</p>

            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {stats.totalTasks}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-red-700">Overdue</p>

            <p className="mt-3 text-3xl font-semibold text-red-900">
              {stats.overdueTasks}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">By status</h2>

            <div className="mt-6">
              <DistributionList
                items={stats.byColumn.map((item) => ({
                  label: item.columnName ?? 'No status',
                  count: item.count,
                }))}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
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

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
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

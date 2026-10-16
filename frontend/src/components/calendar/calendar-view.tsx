'use client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useCalendarTasks } from '@/hooks/calendar/use-calendar-tasks';
import type { Task, TaskPriority } from '@/lib/tasks';
import { useCalendarRealtime } from '@/hooks/realtime/use-calendar-realtime';
import { useProjects } from '@/hooks/projects/use-projects';
import {
  buildCalendarDays,
  getCalendarRange,
  getDateKey,
} from '@/lib/calendar-utils';

const weekDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const priorityClasses: Record<TaskPriority, string> = {
  LOW: 'border-border bg-muted/40 text-muted-foreground',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  HIGH: 'border-destructive/25 bg-destructive/10 text-destructive',
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatTaskTime(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

function getTaskDateKey(task: Task) {
  if (!task.dueDate) {
    return null;
  }

  return getDateKey(new Date(task.dueDate));
}

function CalendarTask({ task }: { task: Task }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block rounded-lg border border-border bg-card p-2 text-left shadow-sm transition hover:border-slate-400 hover:shadow"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold text-muted-foreground">
          {task.issueKey ?? `#${task.id}`}
        </span>

        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${priorityClasses[task.priority]}`}
        >
          {priorityLabels[task.priority]}
        </span>
      </div>

      <p className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-foreground">
        {task.title}
      </p>

      {task.dueDate && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {formatTaskTime(task.dueDate)}
        </p>
      )}
    </Link>
  );
}

export function CalendarView() {
  const { data: projects } = useProjects();

  const projectIds = useMemo(
    () => projects?.map((project) => project.id) ?? [],
    [projects],
  );

  useCalendarRealtime(projectIds);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();

    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const { start, end } = useMemo(
    () => getCalendarRange(currentMonth),
    [currentMonth],
  );

  const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const from = start.toISOString();
  const to = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() + 1,
  ).toISOString();

  const { data: tasks, isPending, isError } = useCalendarTasks(from, to);

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, Task[]>();

    for (const task of tasks ?? []) {
      const dateKey = getTaskDateKey(task);

      if (!dateKey) {
        continue;
      }

      const current = grouped.get(dateKey) ?? [];
      current.push(task);
      grouped.set(dateKey, current);
    }

    return grouped;
  }, [tasks]);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1),
    );
  };

  const goToToday = () => {
    const today = new Date();

    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/projects">Back to Projects</Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>

          <p className="text-sm mt-2 font-medium text-muted-foreground">
            Task Tracker
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Calendar
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            View tasks by their due dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" type="button" onClick={goToPreviousMonth}>
            Previous
          </Button>

          <Button variant="outline" type="button" onClick={goToToday}>
            Today
          </Button>

          <Button variant="outline" type="button" onClick={goToNextMonth}>
            Next
          </Button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {formatMonthTitle(currentMonth)}
        </h2>

        {isPending && (
          <span className="text-sm text-muted-foreground">Loading...</span>
        )}

        {!isPending && !isError && (
          <span className="text-sm text-muted-foreground">
            {tasks?.length ?? 0} {(tasks?.length ?? 0) === 1 ? 'task' : 'tasks'}
          </span>
        )}
      </div>

      {isError ? (
        <div className="mt-6 rounded-2xl border border-destructive/25 bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load calendar
          </h2>

          <p className="mt-2 text-sm text-destructive">
            Tasks could not be loaded for this period.
          </p>
        </div>
      ) : (
        <Card asChild>
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="border-r border-border px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0"
                >
                  <span className="hidden sm:inline">{day}</span>

                  <span className="sm:hidden">{day.slice(0, 3)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayTasks = tasksByDate.get(day.dateKey) ?? [];

                return (
                  <div
                    key={day.dateKey}
                    className={`min-h-40 border-b border-r border-border p-2 ${
                      day.isCurrentMonth ? 'bg-card' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex justify-end">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          day.isToday
                            ? 'bg-primary text-primary-foreground'
                            : day.isCurrentMonth
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {day.date.getDate()}
                      </span>
                    </div>

                    <div className="mt-2 space-y-2">
                      {dayTasks.map((task) => (
                        <CalendarTask key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}

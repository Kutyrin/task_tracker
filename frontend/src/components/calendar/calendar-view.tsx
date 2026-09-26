'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useCalendarTasks } from '@/hooks/calendar/use-calendar-tasks';
import type { Task, TaskPriority } from '@/lib/tasks';

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
  LOW: 'border-slate-200 bg-slate-50 text-slate-600',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
  HIGH: 'border-red-200 bg-red-50 text-red-700',
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

interface CalendarDay {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getCalendarRange(month: Date) {
  const monthStart = getMonthStart(month);
  const monthEnd = getMonthEnd(month);

  const start = new Date(monthStart);
  start.setDate(start.getDate() - getMondayIndex(start));

  const end = new Date(monthEnd);
  const remainingDays = 6 - getMondayIndex(end);

  end.setDate(end.getDate() + remainingDays);

  return {
    start,
    end,
  };
}

function buildCalendarDays(month: Date): CalendarDay[] {
  const { start, end } = getCalendarRange(month);

  const todayKey = getDateKey(new Date());
  const days: CalendarDay[] = [];

  const current = new Date(start);

  while (current <= end) {
    days.push({
      date: new Date(current),
      dateKey: getDateKey(current),
      isCurrentMonth:
        current.getMonth() === month.getMonth() &&
        current.getFullYear() === month.getFullYear(),
      isToday: getDateKey(current) === todayKey,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

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
      className="block rounded-lg border border-slate-200 bg-white p-2 text-left shadow-sm transition hover:border-slate-400 hover:shadow"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold text-slate-500">
          {task.issueKey ?? `#${task.id}`}
        </span>

        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${priorityClasses[task.priority]}`}
        >
          {priorityLabels[task.priority]}
        </span>
      </div>

      <p className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-slate-950">
        {task.title}
      </p>

      {task.dueDate && (
        <p className="mt-1 text-[10px] text-slate-400">
          {formatTaskTime(task.dueDate)}
        </p>
      )}
    </Link>
  );
}

export function CalendarView() {
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
          <p className="text-sm font-medium text-slate-500">Task Tracker</p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Calendar
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            View tasks by their due dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Previous
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Today
          </button>

          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-950">
          {formatMonthTitle(currentMonth)}
        </h2>

        {isPending && (
          <span className="text-sm text-slate-500">Loading...</span>
        )}

        {!isPending && !isError && (
          <span className="text-sm text-slate-500">
            {tasks?.length ?? 0} {(tasks?.length ?? 0) === 1 ? 'task' : 'tasks'}
          </span>
        )}
      </div>

      {isError ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">
            Failed to load calendar
          </h2>

          <p className="mt-2 text-sm text-red-700">
            Tasks could not be loaded for this period.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {weekDays.map((day) => (
              <div
                key={day}
                className="border-r border-slate-200 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 last:border-r-0"
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
                  className={`min-h-40 border-b border-r border-slate-200 p-2 last:border-r-0 ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70'
                  }`}
                >
                  <div className="flex justify-end">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        day.isToday
                          ? 'bg-slate-950 text-white'
                          : day.isCurrentMonth
                            ? 'text-slate-700'
                            : 'text-slate-400'
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
      )}
    </section>
  );
}

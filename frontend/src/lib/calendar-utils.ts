export interface CalendarDay {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getMondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getCalendarRange(month: Date) {
  const monthStart = getMonthStart(month);
  const monthEnd = getMonthEnd(month);

  const start = new Date(monthStart);
  start.setDate(start.getDate() - getMondayIndex(start));

  const end = new Date(monthEnd);
  const remainingDays = 6 - getMondayIndex(end);

  end.setDate(end.getDate() + remainingDays);

  return { start, end };
}

export function buildCalendarDays(month: Date): CalendarDay[] {
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

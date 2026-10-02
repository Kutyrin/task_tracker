import {
  buildCalendarDays,
  getCalendarRange,
  getDateKey,
  getMondayIndex,
} from '@/lib/calendar-utils';
import { describe, expect, it } from 'vitest';

describe('calendar-utils', () => {
  it('formats a date key', () => {
    expect(getDateKey(new Date(2026, 8, 7))).toBe('2026-09-07');
  });

  it('returns Monday as index 0', () => {
    expect(getMondayIndex(new Date(2026, 8, 7))).toBe(0);
  });

  it('returns Sunday as index 6', () => {
    expect(getMondayIndex(new Date(2026, 8, 13))).toBe(6);
  });

  it('builds a Monday-to-Sunday calendar range', () => {
    const { start, end } = getCalendarRange(new Date(2026, 8, 1));

    expect(getDateKey(start)).toBe('2026-08-31');
    expect(getDateKey(end)).toBe('2026-10-04');
  });

  it('builds all visible calendar days', () => {
    const days = buildCalendarDays(new Date(2026, 8, 1));

    expect(days).toHaveLength(35);
    expect(days[0].dateKey).toBe('2026-08-31');
    expect(days[34].dateKey).toBe('2026-10-04');
  });

  it('marks only days from the selected month as current month', () => {
    const days = buildCalendarDays(new Date(2026, 8, 1));

    expect(days[0].isCurrentMonth).toBe(false);
    expect(
      days.find((day) => day.dateKey === '2026-09-01')?.isCurrentMonth,
    ).toBe(true);
    expect(days[34].isCurrentMonth).toBe(false);
  });
});

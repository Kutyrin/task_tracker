import { useQuery } from '@tanstack/react-query';

import { getCalendarTasks } from '@/lib/calendar';

export function useCalendarTasks(from: string, to: string) {
  return useQuery({
    queryKey: ['tasks', 'calendar', from, to],
    queryFn: () => getCalendarTasks(from, to),
  });
}

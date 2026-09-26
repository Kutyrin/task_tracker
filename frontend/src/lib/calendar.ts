import api from '@/lib/api';
import type { Task } from '@/lib/tasks';

export interface CalendarTasksResponse {
  data: Task[];
}

export async function getCalendarTasks(
  from: string,
  to: string,
): Promise<Task[]> {
  const response = await api.get<CalendarTasksResponse>('/tasks/calendar', {
    params: {
      from,
      to,
    },
  });

  return response.data.data;
}

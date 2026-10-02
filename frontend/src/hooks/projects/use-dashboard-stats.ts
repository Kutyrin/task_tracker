import { useQuery } from '@tanstack/react-query';

import { getDashboardStats } from '@/lib/projects';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['projects', 'stats'],
    queryFn: getDashboardStats,
  });
}

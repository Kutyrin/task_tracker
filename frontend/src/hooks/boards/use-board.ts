import { useQuery } from '@tanstack/react-query';

import { getBoard } from '@/lib/boards';

export function useBoard(boardId: number) {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: () => getBoard(boardId),
    enabled: Number.isInteger(boardId) && boardId > 0,
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createBoard, type CreateBoardData } from '@/lib/boards';

export function useCreateBoard(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Pick<CreateBoardData, 'name'>) =>
      createBoard({
        projectId,
        name: data.name,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'boards'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId],
      });
    },
  });
}

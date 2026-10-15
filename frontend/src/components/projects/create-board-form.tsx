'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useCreateBoard } from '@/hooks/projects/use-create-board';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Board name is required')
    .max(100, 'Board name must contain at most 100 characters'),
});

type FormValues = z.infer<typeof schema>;

interface CreateBoardFormProps {
  projectId: number;
}

export function CreateBoardForm({ projectId }: CreateBoardFormProps) {
  const createBoardMutation = useCreateBoard(projectId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createBoardMutation.mutateAsync(values);

      reset();
    } catch {
      return;
    }
  };

  return (
    <form
      className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex-1">
        <Input
          {...register('name')}
          type="text"
          autoComplete="off"
          className="w-full"
          placeholder="Main Board"
        />

        {errors.name && (
          <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <Button variant="default" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create board'}
      </Button>

      {createBoardMutation.isError && (
        <p className="text-sm text-destructive">Failed to create board.</p>
      )}
    </form>
  );
}

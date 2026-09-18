'use client';

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
      className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex-1">
        <input
          {...register('name')}
          type="text"
          autoComplete="off"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
          placeholder="Main Board"
        />

        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Creating...' : 'Create board'}
      </button>

      {createBoardMutation.isError && (
        <p className="text-sm text-red-600">Failed to create board.</p>
      )}
    </form>
  );
}


'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useCreateProject } from '@/hooks/projects/use-create-project';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(100, 'Project name must contain at most 100 characters'),
  key: z
    .string()
    .trim()
    .min(2, 'Project key must contain at least 2 characters')
    .max(10, 'Project key must contain at most 10 characters')
    .regex(
      /^[A-Z0-9]+$/,
      'Project key must contain only uppercase letters and numbers',
    ),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must contain at most 2000 characters'),
});

type FormValues = z.infer<typeof schema>;

function CreateProjectContent() {
  const router = useRouter();
  const createProjectMutation = useCreateProject();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError('');

    try {
      const project = await createProjectMutation.mutateAsync({
        name: values.name,
        key: values.key,
        description: values.description || undefined,
      });

      router.push(`/projects/${project.id}`);
    } catch {
      setServerError(
        'Failed to create project. The project key may already be in use.',
      );
    }
  };

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/projects"
          className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          ← Back to projects
        </Link>

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-500">Task Tracker</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Create project
          </h1>

          <p className="mt-2 text-slate-600">
            Create a project for your team and tasks.
          </p>
        </div>

        <form
          className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={handleSubmit(onSubmit)}
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Project name
            </span>

            <input
              {...register('name')}
              type="text"
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
              placeholder="Task Tracker"
            />

            {errors.name && (
              <span className="mt-1 block text-sm text-red-600">
                {errors.name.message}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Project key
            </span>

            <input
              {...register('key', {
                setValueAs: (value: string) =>
                  value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
              })}
              type="text"
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 uppercase outline-none transition focus:border-slate-900"
              placeholder="TASK"
            />

            <p className="mt-1 text-xs text-slate-500">
              2–10 characters, uppercase letters and numbers only.
            </p>

            {errors.key && (
              <span className="mt-1 block text-sm text-red-600">
                {errors.key.message}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Description
            </span>

            <textarea
              {...register('description')}
              rows={5}
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
              placeholder="Describe what this project is about."
            />

            {errors.description && (
              <span className="mt-1 block text-sm text-red-600">
                {errors.description.message}
              </span>
            )}
          </label>

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <div className="flex gap-3">
            <Link
              href="/projects"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function CreateProjectPage() {
  return (
    <ProtectedRoute>
      <CreateProjectContent />
    </ProtectedRoute>
  );
}

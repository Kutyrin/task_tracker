'use client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>

        <div className="mt-6">
          <p className="text-sm font-medium text-muted-foreground">
            Task Tracker
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Create project
          </h1>

          <p className="mt-2 text-muted-foreground">
            Create a project for your team and tasks.
          </p>
        </div>

        <form
          className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Label className="block">
            <span className="text-sm font-medium text-foreground">
              Project name
            </span>

            <Input
              {...register('name')}
              type="text"
              autoComplete="off"
              className="mt-2 w-full"
              placeholder="Task Tracker"
            />

            {errors.name && (
              <span className="mt-1 block text-sm text-destructive">
                {errors.name.message}
              </span>
            )}
          </Label>

          <Label className="block">
            <span className="text-sm font-medium text-foreground">
              Project key
            </span>

            <Input
              {...register('key', {
                setValueAs: (value: string) =>
                  value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
              })}
              type="text"
              autoComplete="off"
              className="mt-2 w-full uppercase"
              placeholder="TASK"
            />

            <p className="mt-1 text-xs text-muted-foreground">
              2–10 characters, uppercase letters and numbers only.
            </p>

            {errors.key && (
              <span className="mt-1 block text-sm text-destructive">
                {errors.key.message}
              </span>
            )}
          </Label>

          <Label className="block">
            <span className="text-sm font-medium text-foreground">
              Description
            </span>

            <Textarea
              {...register('description')}
              rows={5}
              className="mt-2 w-full"
              placeholder="Describe what this project is about."
            />

            {errors.description && (
              <span className="mt-1 block text-sm text-destructive">
                {errors.description.message}
              </span>
            )}
          </Label>

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/projects">Cancel</Link>
            </Button>

            <Button
              variant="default"
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create project'}
            </Button>
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

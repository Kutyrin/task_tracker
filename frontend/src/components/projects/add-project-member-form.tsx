'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAddProjectMember } from '@/hooks/projects/use-add-project-member';
import type { ProjectRole } from '@/lib/projects';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['MEMBER', 'ADMIN']),
});

type FormValues = z.infer<typeof schema>;

interface AddProjectMemberFormProps {
  projectId: number;
  currentRole: ProjectRole | null;
}

export function AddProjectMemberForm({
  projectId,
  currentRole,
}: AddProjectMemberFormProps) {
  const addMemberMutation = useAddProjectMember(projectId);
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      role: 'MEMBER',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSuccessMessage('');

    try {
      await addMemberMutation.mutateAsync(values);

      reset({
        email: '',
        role: 'MEMBER',
      });

      setSuccessMessage('Member added successfully.');
    } catch {
      setSuccessMessage('');
    }
  };

  const canAssignAdmin = currentRole === 'OWNER';

  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <h3 className="text-sm font-semibold text-slate-950">Add member</h3>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>

          <input
            {...register('email')}
            type="email"
            autoComplete="off"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
            placeholder="user@example.com"
          />

          {errors.email && (
            <span className="mt-1 block text-sm text-red-600">
              {errors.email.message}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Role</span>

          <select
            {...register('role')}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900"
          >
            <option value="MEMBER">Member</option>

            {canAssignAdmin && <option value="ADMIN">Admin</option>}
          </select>

          {errors.role && (
            <span className="mt-1 block text-sm text-red-600">
              {errors.role.message}
            </span>
          )}
        </label>

        {addMemberMutation.isError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Failed to add member. The user may not exist or may already be a
            project member.
          </p>
        )}

        {successMessage && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Adding...' : 'Add member'}
        </button>
      </form>
    </div>
  );
}

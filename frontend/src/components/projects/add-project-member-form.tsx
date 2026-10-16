'use client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';

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
    <div className="mt-6 border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-foreground">Add member</h3>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Label className="block">
          <span className="text-sm font-medium text-foreground">Email</span>

          <Input
            {...register('email')}
            type="email"
            autoComplete="off"
            className="mt-2 w-full"
            placeholder="user@example.com"
          />

          {errors.email && (
            <span className="mt-1 block text-sm text-destructive">
              {errors.email.message}
            </span>
          )}
        </Label>

        <Label className="block">
          <span className="text-sm font-medium text-foreground">Role</span>

          <NativeSelect {...register('role')} className="mt-2 w-full">
            <option value="MEMBER">Member</option>

            {canAssignAdmin && <option value="ADMIN">Admin</option>}
          </NativeSelect>

          {errors.role && (
            <span className="mt-1 block text-sm text-destructive">
              {errors.role.message}
            </span>
          )}
        </Label>

        {addMemberMutation.isError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Failed to add member. The user may not exist or may already be a
            project member.
          </p>
        )}

        {successMessage && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            {successMessage}
          </p>
        )}

        <Button variant="default" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add member'}
        </Button>
      </form>
    </div>
  );
}

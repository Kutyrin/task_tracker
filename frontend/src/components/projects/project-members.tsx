'use client';

import { useState } from 'react';

import { useRemoveProjectMember } from '@/hooks/projects/use-remove-project-member';
import { useUpdateProjectMemberRole } from '@/hooks/projects/use-update-project-member-role';
import { type ProjectMember, type ProjectRole } from '@/lib/projects';

interface ProjectMembersProps {
  projectId: number;
  currentRole: ProjectRole | null;
  members: ProjectMember[];
}

type EditableProjectRole = Exclude<ProjectRole, 'OWNER'>;

export function ProjectMembers({
  projectId,
  currentRole,
  members,
}: ProjectMembersProps) {
  const updateRoleMutation = useUpdateProjectMemberRole(projectId);
  const removeMemberMutation = useRemoveProjectMember(projectId);

  const [selectedRoles, setSelectedRoles] = useState<
    Record<number, EditableProjectRole>
  >({});
  const [errorMessage, setErrorMessage] = useState('');

  const handleRoleChange = (memberId: number, role: EditableProjectRole) => {
    setErrorMessage('');

    setSelectedRoles((current) => ({
      ...current,
      [memberId]: role,
    }));
  };

  const handleRoleSave = async (
    memberId: number,
    role: EditableProjectRole,
  ) => {
    setErrorMessage('');

    try {
      await updateRoleMutation.mutateAsync({
        memberId,
        role,
      });

      setSelectedRoles((current) => {
        const next = { ...current };
        delete next[memberId];
        return next;
      });
    } catch {
      setErrorMessage('Failed to update member role.');
    }
  };

  const handleRemove = async (memberId: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to remove this member?',
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage('');

    try {
      await removeMemberMutation.mutateAsync(memberId);

      setSelectedRoles((current) => {
        const next = { ...current };
        delete next[memberId];
        return next;
      });
    } catch {
      setErrorMessage('Failed to remove member.');
    }
  };

  return (
    <div className="divide-y divide-slate-200">
      {errorMessage && (
        <p className="pb-4 text-sm text-red-600">{errorMessage}</p>
      )}

      {members.map((member) => {
        const isOwner = member.role === 'OWNER';
        const canManageAsOwner = currentRole === 'OWNER' && !isOwner;
        const canRemoveAsAdmin =
          currentRole === 'ADMIN' && member.role === 'MEMBER';

        const canManage = canManageAsOwner || canRemoveAsAdmin;
        const selectedRole = selectedRoles[member.id] ?? member.role;
        const hasRoleChanges = canManageAsOwner && selectedRole !== member.role;

        return (
          <div
            key={member.id}
            className="flex items-center justify-between gap-4 py-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-950">
                {member.user.email}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Member since {new Date(member.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {canManageAsOwner ? (
                <>
                  <select
                    value={selectedRole}
                    disabled={updateRoleMutation.isPending}
                    onChange={(event) =>
                      handleRoleChange(
                        member.id,
                        event.target.value as EditableProjectRole,
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-slate-900 disabled:opacity-60"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  {hasRoleChanges && (
                    <button
                      type="button"
                      disabled={updateRoleMutation.isPending}
                      onClick={() =>
                        void handleRoleSave(member.id, selectedRole)
                      }
                      className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateRoleMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {member.role}
                </span>
              )}

              {canManage && !isOwner && (
                <button
                  type="button"
                  disabled={removeMemberMutation.isPending}
                  onClick={() => void handleRemove(member.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removeMemberMutation.isPending ? 'Removing...' : 'Remove'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
        <p className="pb-4 text-sm text-destructive">{errorMessage}</p>
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
              <p className="truncate text-sm font-medium text-foreground">
                {member.user.email}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Member since {new Date(member.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {canManageAsOwner ? (
                <>
                  <NativeSelect
                    value={selectedRole}
                    disabled={updateRoleMutation.isPending}
                    onChange={(event) =>
                      handleRoleChange(
                        member.id,
                        event.target.value as EditableProjectRole,
                      )
                    }
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </NativeSelect>

                  {hasRoleChanges && (
                    <Button
                      variant="default"
                      size="sm"
                      type="button"
                      disabled={updateRoleMutation.isPending}
                      onClick={() =>
                        void handleRoleSave(member.id, selectedRole)
                      }
                    >
                      {updateRoleMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  )}
                </>
              ) : (
                <Badge variant="secondary">{member.role}</Badge>
              )}

              {canManage && !isOwner && (
                <Button
                  variant="destructive"
                  size="sm"
                  type="button"
                  disabled={removeMemberMutation.isPending}
                  onClick={() => void handleRemove(member.id)}
                >
                  {removeMemberMutation.isPending ? 'Removing...' : 'Remove'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

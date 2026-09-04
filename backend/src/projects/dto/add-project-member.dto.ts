import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { ProjectRole } from '@prisma/client';

export class AddProjectMemberDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(ProjectRole)
  role: ProjectRole = ProjectRole.MEMBER;
}

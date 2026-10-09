import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(43)
  @MaxLength(128)
  token!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}

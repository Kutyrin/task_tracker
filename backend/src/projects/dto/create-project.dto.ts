import {
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Key must contain only uppercase letters and numbers',
  })
  key!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateLabelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;
}

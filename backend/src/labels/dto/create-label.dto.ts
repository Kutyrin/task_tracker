import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;
}

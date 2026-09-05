import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignLabelDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  labelId!: number;
}

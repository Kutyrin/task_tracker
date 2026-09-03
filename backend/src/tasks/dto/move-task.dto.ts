import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class MoveTaskDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  columnId!: number;

  @IsNumber()
  position!: number;
}

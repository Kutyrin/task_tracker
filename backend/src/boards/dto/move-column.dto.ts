import { IsNumber } from 'class-validator';

export class MoveColumnDto {
  @IsNumber()
  position!: number;
}

import { IsDateString } from 'class-validator';

export class CalendarQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ParticipantInputDto {
  /** Internal user being mentioned. */
  @IsOptional()
  @IsString()
  userId?: string;

  /** Free-text guest (used when userId is empty). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  guestName?: string;
}

export class CreateReservationDto {
  @IsString()
  roomId: string;

  @IsString()
  @MinLength(2, { message: 'عنوان جلسه را وارد کنید.' })
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاریخ باید به قالب YYYY-MM-DD باشد.' })
  date: string;

  @Matches(/^\d{2}:00$/, { message: 'ساعت شروع باید یک اسلات صحیح ساعتی باشد (مثل 09:00).' })
  startTime: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  attendees?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ParticipantInputDto)
  participants?: ParticipantInputDto[];
}

import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  attendees?: number;

  // ---- optional reschedule (all three required together) ----
  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @Matches(/^\d{2}:00$/)
  startTime?: string;
}

export class RejectReservationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

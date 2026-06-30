import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  @MinLength(10, { message: 'توکن تازه‌سازی نامعتبر است.' })
  refreshToken: string;
}

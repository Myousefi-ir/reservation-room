import { IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل معتبر نیست.' })
  mobile: string;

  @IsString()
  @MinLength(1, { message: 'رمز عبور را وارد کنید.' })
  password: string;
}

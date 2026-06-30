import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'نام باید حداقل ۲ کاراکتر باشد.' })
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2, { message: 'نام خانوادگی باید حداقل ۲ کاراکتر باشد.' })
  @MaxLength(50)
  lastName: string;

  @Matches(/^09\d{9}$/, { message: 'شماره موبایل معتبر نیست (مثال: 09121234567).' })
  mobile: string;

  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' })
  @MaxLength(72)
  password: string;
}

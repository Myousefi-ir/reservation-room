# معماری و قراردادهای API

## ۱. نمای کلی

سیستم سه سرویس دارد که با Docker Compose اجرا می‌شوند:

```
[ Browser ] ── HTTP ──> [ frontend: Next.js ] ── REST /api ──> [ backend: NestJS ] ── SQL ──> [ db: PostgreSQL ]
```

- **frontend**: رندر صفحات و رابط کاربری؛ توکن‌ها را نگه می‌دارد و درخواست‌ها را با هدر `Authorization: Bearer` می‌فرستد.
- **backend**: تمام منطق کسب‌وکار، اعتبارسنجی، احراز هویت/مجوز، و دسترسی به دیتابیس.
- **db**: PostgreSQL.

## ۲. مدل داده (Prisma)

جداول اصلی مطابق مشخصات: `users`, `rooms`, `reservations`, `participants`.
جداول کمکیِ اضافه‌شده برای امنیت و آینده‌نگری: `refresh_tokens`, `audit_logs`.

نکات کلیدی:
- `reservations.start_time` / `end_time` به‌صورت رشتهٔ `"HH:mm"` در منطقهٔ زمانی تهران ذخیره می‌شوند و `date` فقط تاریخ (بدون زمان) است. این کار محاسبات اسلات و تداخل را ساده و قطعی می‌کند.
- ضد رزرو هم‌زمان: **ایندکس یکتای جزئی**
  `UNIQUE (room_id, date, start_time) WHERE status = 'active'`
  به‌علاوهٔ تراکنش با قفل ردیف هنگام ساخت رزرو (دفاع لایه‌ای).
- `participants` یا به یک کاربر داخلی اشاره می‌کند (`user_id`) یا نام آزاد مهمان دارد (`guest_name`).

## ۳. احراز هویت و مجوز

- **Access token** (کوتاه‌عمر، پیش‌فرض ۱۵ دقیقه) برای فراخوانی API.
- **Refresh token** (بلندعمر، پیش‌فرض ۷ روز) که هَش‌شده در `refresh_tokens` ذخیره و هنگام استفاده **چرخش (rotate)** می‌شود؛ قابل ابطال.
- نقش‌ها: `user`, `admin`. وضعیت‌ها: `pending`, `active`, `rejected`.
- گاردها:
  - `JwtAuthGuard`: اعتبار توکن.
  - `ApprovedGuard`: فقط کاربر `active` اجازهٔ کار دارد.
  - `RolesGuard` + دکوریتور `@Roles('admin')`: محدودسازی مسیرهای ادمین.

## ۴. قراردادهای API

پیشوند همهٔ مسیرها: `/api`

### Auth
| متد | مسیر | توضیح |
|-----|------|-------|
| POST | `/auth/register` | ثبت‌نام (وضعیت اولیه `pending`) |
| POST | `/auth/login` | ورود (فقط کاربر `active`) → access + refresh |
| POST | `/auth/refresh` | تعویض refresh با جفت توکن تازه |
| POST | `/auth/logout` | ابطال refresh فعلی |
| GET  | `/auth/me` | اطلاعات کاربر جاری |

### User
| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/rooms` | فهرست اتاق‌های فعال |
| GET | `/availability?date=YYYY-MM-DD[&roomId=]` | وضعیت اسلات‌ها (available/past/booked) |
| POST | `/reservations` | ثبت رزرو (کنترل تداخل اتمیک) |
| GET | `/reservations/me` | رزروهای من |
| DELETE | `/reservations/:id` | لغو رزرو خود (قبل از شروع) |
| GET | `/reservations/:id/calendar.ics` | دانلود فایل ICS |
| GET | `/reservations/:id/google-calendar` | لینک افزودن به Google Calendar |
| GET | `/users/search?q=` | جستجوی کاربران برای منشن شرکت‌کننده |

### Admin (`@Roles('admin')`)
| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/admin/users` | فهرست کاربران |
| PATCH | `/admin/users/:id/approve` | تأیید |
| PATCH | `/admin/users/:id/reject` | رد |
| PATCH | `/admin/users/:id/make-admin` | اعطای نقش admin |
| PATCH | `/admin/users/:id/revoke-admin` | سلب نقش admin |
| DELETE | `/admin/users/:id` | حذف کاربر |
| GET | `/admin/reservations` | همهٔ رزروها (فیلتر/صفحه‌بندی) |
| PATCH | `/admin/reservations/:id` | ویرایش رزرو |
| PATCH | `/admin/reservations/:id/reject` | رد رزرو (ثبت در Audit Log) |
| DELETE | `/admin/reservations/:id` | حذف رزرو (ثبت در Audit Log) |
| GET | `/admin/dashboard` | آمار داشبورد |

## ۵. منطق زمان (Asia/Tehran)

تمام تصمیم‌های مربوط به «امروز»، «روز هفته» و «گذشته بودن اسلات» در منطقهٔ زمانی `Asia/Tehran`
محاسبه می‌شوند (`backend/src/common/time/tehran-time.ts`). قواعد:
- پنجره: امروز تا `BOOKING_MAX_DAYS_AHEAD` روز بعد.
- روزهای مجاز: شنبه تا چهارشنبه.
- اسلات‌ها: ساعت‌های صحیح از `BOOKING_START_HOUR` تا `BOOKING_END_HOUR`.

## ۶. نقطهٔ توسعهٔ فاز ۲

- **SMS**: اینترفیس `SmsProvider` (`backend/src/sms`). پیاده‌سازی پیش‌فرض `ConsoleSmsProvider`
  فقط لاگ می‌کند. برای فعال‌سازی واقعی، آداپتر Kavenegar یا ملی‌پیامک را اضافه و
  `SMS_PROVIDER` را تنظیم کنید — بدون تغییر در منطق رزرو.
- **یادآور پیش از جلسه / اعلان**: می‌تواند به‌صورت Cron/Queue روی همین `SmsProvider` سوار شود.
- **تجهیزات اتاق، سهمیه، رزرو تکرارشونده، گزارش آماری**: ستون/جدول‌های مرتبط بدون شکستن مدل فعلی افزوده می‌شوند.
- **Audit Log**: هم‌اکنون برای اقدامات حساس ادمین فعال است و قابل گسترش به کل سیستم است.

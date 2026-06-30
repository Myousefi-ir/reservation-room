# Mammut VIP Room Reservation

اپلیکیشن داخلی رزرو اتاق‌های جلسات سازمان (سازه پوشش ماموت).
فاز اول: دو اتاق `VIP1` و `VIP2` — معماری به گونه‌ای است که افزودن اتاق بدون تغییر معماری ممکن باشد.

## معماری (Monorepo)

```
.
├── backend/         NestJS 10 + Prisma + SQLite  (REST API روی /api + سرو فرانت استاتیک)
├── frontend/        Next.js 14 (App Router) + Tailwind + shadcn-style (RTL فارسی)
├── Dockerfile       ایمیج تک‌سرویس (فرانت + بک‌اند با هم)
├── liara.json       کانفیگ استقرار تک‌سرویس روی لیارا (با دیسک ماندگار)
├── docker-compose.yml
└── .env.example
```

> **تک‌سرویس:** در پروداکشن، یک کانتینر Docker هم API و هم رابط کاربری را سرو می‌کند
> و دیتابیس SQLite روی یک دیسک ماندگار است — یعنی فقط یک سرویس روی لیارا.

| لایه | فناوری |
|------|--------|
| Frontend | Next.js 14, TypeScript, TailwindCSS, RTL (export استاتیک، سرو از بک‌اند) |
| Backend | NestJS 10, Prisma ORM, Passport-JWT |
| Database | SQLite (تک‌فایل، روی دیسک ماندگار) |
| Auth | JWT access token + refresh token (چرخشی، قابل ابطال) |
| SMS | اینترفیس انتزاعی `SmsProvider` (پیاده‌سازی Kavenegar/ملی‌پیامک در فاز ۲) |
| Calendar | تولید فایل `.ics` + لینک Google Calendar |
| Deploy | یک برنامهٔ Docker روی لیارا (راهنما: [`docs/DEPLOY-LIARA.md`](docs/DEPLOY-LIARA.md)) |

## اجرا با Docker (پیشنهادی)

پیش‌نیاز: فقط Docker و Docker Compose.

```bash
cp .env.example .env          # مقادیر را در صورت نیاز ویرایش کنید
docker compose up --build
```

- برنامه (فرانت + API روی یک پورت): http://localhost:4000
- تست سلامت: http://localhost:4000/api/health
- دیتابیس SQLite داخل volume به نام `app_data` ذخیره می‌شود.

هنگام بالا آمدن، برنامه به‌صورت خودکار:
1. اسکیمای دیتابیس را اعمال می‌کند (`prisma db push`).
2. ایندکس یکتای جزئی ضد رزرو هم‌زمان را می‌سازد.
3. داده‌های اولیه (اتاق‌های VIP1/VIP2 و یک ادمین پیش‌فرض) را seed می‌کند.

### ادمین پیش‌فرض

```
موبایل:   09120000000
رمز عبور: Admin@1234
```

> این مقادیر از `.env` خوانده می‌شوند (`SEED_ADMIN_MOBILE` / `SEED_ADMIN_PASSWORD`). حتماً بعد از اولین ورود تغییر دهید.

## اجرای محلی بدون Docker (توسعه)

نیازمند Node.js 20+ (دیتابیس همان فایل SQLite است؛ نیازی به نصب چیزی نیست).

```bash
# backend
cd backend
cp ../.env.example .env
# برای توسعهٔ محلی، DATABASE_URL را به یک فایل نسبی تغییر بده:
#   DATABASE_URL=file:./dev.db
npm install
npx prisma db push
npm run seed
npm run start:dev          # http://localhost:4000

# frontend (ترمینال دیگر) — در حالت توسعه جدا اجرا می‌شود
cd frontend
npm install
npm run dev                # http://localhost:3000  (CORS_ORIGIN را روی همین بگذار)
```

> در حالت توسعه، فرانت روی `:3000` و بک‌اند روی `:4000` جداست؛ پس `CORS_ORIGIN`
> و `NEXT_PUBLIC_API_BASE_URL` در `.env` کاربرد دارند. در پروداکشن (تک‌سرویس)
> هر دو هم‌مبدأ هستند و لازم نیستند.

## قواعد کلیدی Business Logic (پیاده‌سازی‌شده)

- رزرو فقط از **امروز تا ۱۴ روز آینده**.
- فقط **شنبه تا چهارشنبه** (پنجشنبه/جمعه غیرفعال).
- اسلات‌های ثابت یک‌ساعته: `08-09 ... 15-16`.
- هر اسلات برای هر اتاق فقط **یک رزرو فعال** — کنترل تداخل **اتمیک** با Transaction (SQLite نوشتن‌ها را سریالایز می‌کند) + **ایندکس یکتای جزئی** روی رزروهای فعال به‌عنوان ضمانت نهایی.
- کاربر تأییدنشده (`pending`) امکان ورود ندارد.
- فقط ادمین می‌تواند نقش admin بدهد/بگیرد.
- کاربر فقط رزرو خودش را و فقط **قبل از شروع جلسه** می‌تواند لغو کند.
- حذف/رد رزرو توسط ادمین در **Audit Log** ثبت می‌شود.
- تمام زمان‌ها بر مبنای `Asia/Tehran`.

## فازِ دوم (در معماری دیده شده)

اینترفیس‌ها و جداول طوری طراحی شده‌اند که این موارد بدون تغییر معماری اضافه شوند:
اعلان پیامکی/ایمیلی، یادآور پیش از جلسه، همگام‌سازی دوطرفه تقویم، رزرو تکرارشونده،
تجهیزات اتاق، محدودیت سهمیه، گزارش آماری، Audit Log کامل، فیلتر پیشرفته، PWA.

جزئیات نقشه راه و قراردادهای API: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

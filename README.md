# Mammut VIP Room Reservation

اپلیکیشن داخلی رزرو اتاق‌های جلسات سازمان (سازه پوشش ماموت).
فاز اول: دو اتاق `VIP1` و `VIP2` — معماری به گونه‌ای است که افزودن اتاق بدون تغییر معماری ممکن باشد.

## معماری (Monorepo)

```
.
├── backend/         NestJS 10 + Prisma + PostgreSQL  (REST API روی /api)
├── frontend/        Next.js 14 (App Router) + Tailwind + shadcn-style (RTL فارسی)
├── docker-compose.yml
└── .env.example
```

| لایه | فناوری |
|------|--------|
| Frontend | Next.js 14, TypeScript, TailwindCSS, RTL |
| Backend | NestJS 10, Prisma ORM, Passport-JWT |
| Database | PostgreSQL 16 |
| Auth | JWT access token + refresh token (چرخشی، قابل ابطال) |
| SMS | اینترفیس انتزاعی `SmsProvider` (پیاده‌سازی Kavenegar/ملی‌پیامک در فاز ۲) |
| Calendar | تولید فایل `.ics` + لینک Google Calendar |
| Deploy | Docker Compose |

## اجرا با Docker (پیشنهادی)

پیش‌نیاز: فقط Docker و Docker Compose.

```bash
cp .env.example .env          # مقادیر را در صورت نیاز ویرایش کنید
docker compose up --build
```

- فرانت‌اند: http://localhost:3000
- بک‌اند (API): http://localhost:4000/api
- Postgres: localhost:5432

هنگام بالا آمدن، بک‌اند به‌صورت خودکار:
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

نیازمند Node.js 20+ و یک PostgreSQL در دسترس.

```bash
# backend
cd backend
cp ../.env.example .env
npm install
npx prisma db push
npm run seed
npm run start:dev          # http://localhost:4000

# frontend (ترمینال دیگر)
cd frontend
npm install
npm run dev                # http://localhost:3000
```

## قواعد کلیدی Business Logic (پیاده‌سازی‌شده)

- رزرو فقط از **امروز تا ۱۴ روز آینده**.
- فقط **شنبه تا چهارشنبه** (پنجشنبه/جمعه غیرفعال).
- اسلات‌های ثابت یک‌ساعته: `08-09 ... 15-16`.
- هر اسلات برای هر اتاق فقط **یک رزرو فعال** — کنترل تداخل **اتمیک** با Transaction + قفل ردیف و ایندکس یکتای جزئی.
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

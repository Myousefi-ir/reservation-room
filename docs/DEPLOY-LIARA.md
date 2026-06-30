# استقرار روی لیارا (با اتصال به GitHub)

سه سرویس می‌سازیم: **دیتابیس PostgreSQL** + **برنامهٔ بک‌اند (Docker)** + **برنامهٔ فرانت‌اند (Next.js / استاتیک)**.
هر سه از یک ریپوی GitHub دیپلوی می‌شوند (مونوریپو؛ برای هر برنامه «مسیر» متفاوت تنظیم می‌کنیم).

> ترتیب مهم است: اول دیتابیس، بعد بک‌اند، بعد فرانت‌اند.

---

## گام ۰ — کد روی GitHub

ریپو به‌صورت لوکال آماده و کامیت شده است. فقط کافی است یک ریپوی خالی در GitHub بسازی و push کنی:

```bash
cd "mammut-vip-reservation"
git remote add origin https://github.com/<USERNAME>/mammut-vip-reservation.git
git branch -M main
git push -u origin main
```

---

## گام ۱ — دیتابیس PostgreSQL

1. پنل لیارا → **دیتابیس** → **ایجاد دیتابیس** → نوع **PostgreSQL** → کوچک‌ترین پلن → بساز.
2. بعد از ساخت، از تب **اتصال**، رشتهٔ اتصال (Connection String) را بردار. چیزی شبیه:
   ```
   postgresql://root:PASSWORD@HOST:PORT/DBNAME
   ```
3. برای Prisma، انتهای آن `?schema=public` اضافه کن. اگر هنگام دیپلوی خطای SSL گرفتی، به‌جایش `?schema=public&sslmode=require` بگذار. این می‌شود مقدار `DATABASE_URL`.

---

## گام ۲ — برنامهٔ بک‌اند (Docker)

1. پنل لیارا → **برنامه‌ها** → **ایجاد برنامه** → پلتفرم **Docker** → نام: `mammut-vip-api` → کوچک‌ترین پلن.
2. تب **استقرار / Git** → اتصال به **GitHub** → همان ریپو → شاخهٔ `main`.
   - **مسیر استقرار (Path):** `backend`
3. تب **متغیرهای محیطی** → این‌ها را ست کن:

   | کلید | مقدار |
   |------|-------|
   | `DATABASE_URL` | رشتهٔ اتصال گام ۱ (با `?schema=public`) |
   | `JWT_ACCESS_SECRET` | یک رشتهٔ تصادفی بلند |
   | `JWT_REFRESH_SECRET` | یک رشتهٔ تصادفی بلند (متفاوت) |
   | `JWT_ACCESS_TTL` | `15m` |
   | `JWT_REFRESH_TTL` | `7d` |
   | `APP_TIMEZONE` | `Asia/Tehran` |
   | `BACKEND_PORT` | `4000` |
   | `CORS_ORIGIN` | فعلاً خالی بگذار؛ در گام ۴ پر می‌کنیم |
   | `SEED_ADMIN_MOBILE` | `09120000000` (یا شمارهٔ خودت) |
   | `SEED_ADMIN_PASSWORD` | یک رمز قوی |
   | `SMS_PROVIDER` | `console` |

4. **استقرار** را بزن. هنگام بالا آمدن، خودکار: اسکیمای دیتابیس ساخته می‌شود، اتاق‌های VIP1/VIP2 و ادمین پیش‌فرض seed می‌شوند، و API روی `/api` بالا می‌آید.
5. آدرس برنامه را یادداشت کن، مثلاً: `https://mammut-vip-api.liara.run`
   - تست سلامت: `https://mammut-vip-api.liara.run/api/health` باید `{"status":"ok"}` بدهد.
   - اگر بررسی سلامت لیارا گیر داد، در تنظیمات Health Check مسیر را `/api/health` بگذار.

---

## گام ۳ — برنامهٔ فرانت‌اند (Next.js استاتیک)

1. پنل لیارا → **ایجاد برنامه** → پلتفرم **Next.js** → نام: `mammut-vip-web` → کوچک‌ترین پلن.
2. تب **Git** → همان ریپوی GitHub → شاخهٔ `main` → **مسیر استقرار (Path):** `frontend`
3. تب **متغیرهای محیطی**:

   | کلید | مقدار |
   |------|-------|
   | `NEXT_OUTPUT` | `export` |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://mammut-vip-api.liara.run/api` (آدرس بک‌اند گام ۲ + `/api`) |

4. **استقرار** را بزن. آدرس فرانت، مثلاً: `https://mammut-vip-web.liara.run`

---

## گام ۴ — اتصال نهایی (CORS)

1. به برنامهٔ **بک‌اند** برگرد → متغیر `CORS_ORIGIN` را برابر آدرس فرانت بگذار:
   ```
   CORS_ORIGIN=https://mammut-vip-web.liara.run
   ```
2. بک‌اند را **دوباره استقرار/ری‌استارت** کن.
3. تمام! وارد `https://mammut-vip-web.liara.run` شو، با ادمین پیش‌فرض لاگین کن، رمز را عوض کن، و کاربرها را تأیید کن.

---

## نکته‌ها

- **هزینه:** فقط دیتابیس و بک‌اند پولِ واقعی می‌خواهند (هر کدام پلن کوچک). فرانتِ استاتیک ناچیز است.
- **به‌روزرسانی:** هر `git push` روی `main` → لیارا خودکار دوباره دیپلوی می‌کند.
- **بکاپ دیتابیس:** از تب بکاپِ سرویس Postgres در لیارا فعال کن.
- **دامنهٔ اختصاصی:** بعداً از تب «دامنه» هر برنامه می‌توانی دامنهٔ خودت را با SSL رایگان وصل کنی (آن‌وقت `CORS_ORIGIN` و `NEXT_PUBLIC_API_BASE_URL` را به دامنهٔ جدید به‌روزرسانی کن).

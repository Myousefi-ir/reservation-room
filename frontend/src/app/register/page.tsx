'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', mobile: '', password: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ ...form, mobile: form.mobile.trim() });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ثبت‌نام ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <h1 className="mb-1 text-center text-lg font-bold text-slate-800">ثبت‌نام</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          پس از ثبت‌نام، حساب شما باید توسط مدیر تأیید شود.
        </p>

        {done ? (
          <div className="space-y-4">
            <Alert tone="success">
              ثبت‌نام شما انجام شد. حساب شما پس از تأیید مدیر فعال می‌شود و سپس می‌توانید وارد شوید.
            </Alert>
            <Link href="/login">
              <Button className="w-full" variant="outline">
                بازگشت به ورود
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">نام</Label>
                <Input id="firstName" value={form.firstName} onChange={update('firstName')} required />
              </div>
              <div>
                <Label htmlFor="lastName">نام خانوادگی</Label>
                <Input id="lastName" value={form.lastName} onChange={update('lastName')} required />
              </div>
            </div>
            <div>
              <Label htmlFor="mobile">شماره موبایل</Label>
              <Input
                id="mobile"
                inputMode="numeric"
                dir="ltr"
                placeholder="09xxxxxxxxx"
                value={form.mobile}
                onChange={update('mobile')}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                placeholder="حداقل ۸ کاراکتر"
                value={form.password}
                onChange={update('password')}
                required
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              ثبت‌نام
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-slate-500">
          حساب دارید؟{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            ورود
          </Link>
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(mobile.trim(), password);
      router.replace(user.role === 'admin' ? '/admin' : '/reserve');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ورود ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            M
          </div>
          <h1 className="text-lg font-bold text-slate-800">رزرو اتاق جلسات ماموت</h1>
          <p className="mt-1 text-sm text-slate-500">برای ورود، شماره موبایل و رمز عبور را وارد کنید.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div>
            <Label htmlFor="mobile">شماره موبایل</Label>
            <Input
              id="mobile"
              inputMode="numeric"
              dir="ltr"
              placeholder="09xxxxxxxxx"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            ورود
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          حساب ندارید؟{' '}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            ثبت‌نام
          </Link>
        </p>
      </div>
    </div>
  );
}

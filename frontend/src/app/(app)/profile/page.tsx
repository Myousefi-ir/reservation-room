'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import type { User } from '@/lib/types';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const body: Record<string, string> = { firstName, lastName };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      await api.patch<User>('/users/me', body);
      await refreshUser();
      setMessage('پروفایل به‌روزرسانی شد.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'به‌روزرسانی ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">پروفایل</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>اطلاعات حساب</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            {message && <Alert tone="success">{message}</Alert>}
            {error && <Alert tone="error">{error}</Alert>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">نام</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lastName">نام خانوادگی</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>شماره موبایل</Label>
              <Input dir="ltr" value={user?.mobile ?? ''} disabled />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-600">تغییر رمز عبور (اختیاری)</p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cp">رمز فعلی</Label>
                  <Input
                    id="cp"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="np">رمز جدید</Label>
                  <Input
                    id="np"
                    type="password"
                    placeholder="حداقل ۸ کاراکتر"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" loading={loading}>
              ذخیره تغییرات
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

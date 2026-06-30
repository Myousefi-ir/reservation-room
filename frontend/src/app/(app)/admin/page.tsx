'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { toPersianDigits } from '@/lib/jalali';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { PageLoader } from '@/components/ui/spinner';
import type { DashboardStats } from '@/lib/types';

function StatCard({ label, value, hint, accent }: { label: string; value: number; hint?: string; accent: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${accent}`}>{toPersianDigits(value)}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setStats(await api.get<DashboardStats>('/admin/dashboard'));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'دریافت آمار ناموفق بود.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">داشبورد</h1>
        <p className="mt-1 text-sm text-slate-500">به‌روزرسانی: {stats.asOf}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="کل کاربران" value={stats.users.total} accent="text-brand-600" />
        <StatCard
          label="در انتظار تأیید"
          value={stats.users.pending}
          hint="نیازمند بررسی"
          accent="text-amber-600"
        />
        <StatCard label="کاربران فعال" value={stats.users.active} accent="text-green-600" />
        <StatCard label="رزرو امروز" value={stats.reservations.today} accent="text-brand-600" />
        <StatCard label="رزرو این هفته" value={stats.reservations.week} accent="text-brand-600" />
        <StatCard
          label="اتاق‌های آزاد / اشغال (اکنون)"
          value={stats.rooms.freeNow}
          hint={`اشغال: ${toPersianDigits(stats.rooms.occupiedNow)} از ${toPersianDigits(stats.rooms.total)}`}
          accent="text-green-600"
        />
      </div>
    </div>
  );
}

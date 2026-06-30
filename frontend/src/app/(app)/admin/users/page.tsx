'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatJalaliFull } from '@/lib/jalali';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { PageLoader } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { AdminUser, UserStatus } from '@/lib/types';

const STATUS_BADGE: Record<UserStatus, { label: string; tone: 'green' | 'yellow' | 'red' }> = {
  active: { label: 'فعال', tone: 'green' },
  pending: { label: 'در انتظار', tone: 'yellow' },
  rejected: { label: 'رد شده', tone: 'red' },
};

const FILTERS: { key: UserStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'pending', label: 'در انتظار' },
  { key: 'active', label: 'فعال' },
  { key: 'rejected', label: 'رد شده' },
];

export default function AdminUsersPage() {
  const [filter, setFilter] = useState<UserStatus | 'all'>('all');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      setUsers(await api.get<AdminUser[]>(`/admin/users${qs}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'دریافت کاربران ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(id: string, run: () => Promise<unknown>) {
    setBusyId(id);
    setError('');
    try {
      await run();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'عملیات ناموفق بود.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">کاربران</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm transition-colors',
              filter === f.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : users.length === 0 ? (
        <Alert tone="info">کاربری یافت نشد.</Alert>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {u.firstName} {u.lastName}
                    </span>
                    <Badge tone={STATUS_BADGE[u.status].tone}>{STATUS_BADGE[u.status].label}</Badge>
                    {u.role === 'admin' && <Badge tone="blue">مدیر</Badge>}
                  </div>
                  <div className="text-sm text-slate-500">
                    <span className="ltr">{u.mobile}</span> • ثبت‌نام: {formatJalaliFull(u.createdAt.slice(0, 10))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {u.status !== 'active' && (
                    <Button
                      size="sm"
                      loading={busyId === u.id}
                      onClick={() => action(u.id, () => api.patch(`/admin/users/${u.id}/approve`))}
                    >
                      تأیید
                    </Button>
                  )}
                  {u.status !== 'rejected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busyId === u.id}
                      onClick={() => action(u.id, () => api.patch(`/admin/users/${u.id}/reject`))}
                    >
                      رد
                    </Button>
                  )}
                  {u.role === 'user' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === u.id}
                      onClick={() => action(u.id, () => api.patch(`/admin/users/${u.id}/make-admin`))}
                    >
                      ادمین کردن
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === u.id}
                      onClick={() => action(u.id, () => api.patch(`/admin/users/${u.id}/revoke-admin`))}
                    >
                      حذف ادمین
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busyId === u.id}
                    onClick={() => {
                      if (confirm('این کاربر حذف شود؟')) {
                        action(u.id, () => api.del(`/admin/users/${u.id}`));
                      }
                    }}
                  >
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

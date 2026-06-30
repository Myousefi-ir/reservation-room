'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, downloadIcs } from '@/lib/api';
import { formatJalaliFull } from '@/lib/jalali';
import { slotLabel } from '@/lib/date-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { PageLoader } from '@/components/ui/spinner';
import type { Reservation, ReservationStatus } from '@/lib/types';

const STATUS: Record<ReservationStatus, { label: string; tone: 'green' | 'gray' | 'red' }> = {
  active: { label: 'فعال', tone: 'green' },
  cancelled: { label: 'لغو شده', tone: 'gray' },
  deleted: { label: 'حذف شده', tone: 'red' },
};

export default function MyReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Reservation[]>('/reservations/me');
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'دریافت رزروها ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id: string) {
    if (!confirm('این رزرو لغو شود؟')) return;
    setBusyId(id);
    setError('');
    try {
      await api.del(`/reservations/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'لغو ناموفق بود.');
    } finally {
      setBusyId(null);
    }
  }

  async function openGoogle(id: string) {
    const { url } = await api.get<{ url: string }>(`/reservations/${id}/google-calendar`);
    window.open(url, '_blank');
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">رزروهای من</h1>
      {error && <Alert tone="error">{error}</Alert>}

      {items.length === 0 ? (
        <Alert tone="info">هنوز رزروی ثبت نکرده‌اید.</Alert>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{r.title}</span>
                    <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                  </div>
                  <div className="text-sm text-slate-500">
                    {formatJalaliFull(r.date)} • {r.room.name} •{' '}
                    <span className="ltr">{slotLabel(r.startTime, r.endTime)}</span>
                  </div>
                  {r.participants.length > 0 && (
                    <div className="text-xs text-slate-400">
                      شرکت‌کنندگان: {r.participants.map((p) => p.name).join('، ')}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openGoogle(r.id)}>
                    Google
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadIcs(r.id, `reservation-${r.id}.ics`)}
                  >
                    ICS
                  </Button>
                  {r.canCancel && (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busyId === r.id}
                      onClick={() => cancel(r.id)}
                    >
                      لغو
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

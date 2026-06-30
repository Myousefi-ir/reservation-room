'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatJalaliFull, toPersianDigits } from '@/lib/jalali';
import { slotLabel } from '@/lib/date-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { PageLoader } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea } from '@/components/ui/input';
import type { Paginated, Reservation, ReservationStatus, Room } from '@/lib/types';

const STATUS_BADGE: Record<ReservationStatus, { label: string; tone: 'green' | 'gray' | 'red' }> = {
  active: { label: 'فعال', tone: 'green' },
  cancelled: { label: 'لغو شده', tone: 'gray' },
  deleted: { label: 'حذف شده', tone: 'red' },
};

const HOURS = Array.from({ length: 8 }, (_, i) => 8 + i); // 8..15 start hours

const selectClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export default function AdminReservationsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [data, setData] = useState<Paginated<Reservation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [inputs, setInputs] = useState({ date: '', roomId: '', status: '', q: '' });
  const [applied, setApplied] = useState({ date: '', roomId: '', status: '', q: '' });
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Reservation | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    attendees: '',
    reschedule: false,
    roomId: '',
    date: '',
    startHour: '8',
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    api.get<Room[]>('/admin/rooms').then(setRooms).catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (applied.date) params.set('date', applied.date);
      if (applied.roomId) params.set('roomId', applied.roomId);
      if (applied.status) params.set('status', applied.status);
      if (applied.q) params.set('q', applied.q);
      params.set('page', String(page));
      params.set('pageSize', '20');
      setData(await api.get<Paginated<Reservation>>(`/admin/reservations?${params.toString()}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'دریافت رزروها ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setApplied({ ...inputs });
  }

  async function act(id: string, run: () => Promise<unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
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

  function openEdit(r: Reservation) {
    setEditError('');
    setEditForm({
      title: r.title,
      description: r.description ?? '',
      attendees: String(r.attendees),
      reschedule: false,
      roomId: r.room.id,
      date: r.date,
      startHour: String(parseInt(r.startTime.slice(0, 2), 10)),
    });
    setEditing(r);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setEditError('');
    try {
      const body: Record<string, unknown> = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        attendees: Number(editForm.attendees) || 0,
      };
      if (editForm.reschedule) {
        body.roomId = editForm.roomId;
        body.date = editForm.date;
        body.startTime = `${String(editForm.startHour).padStart(2, '0')}:00`;
      }
      await api.patch(`/admin/reservations/${editing.id}`, body);
      setEditing(null);
      await load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'ذخیره ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">رزروها</h1>

      <Card>
        <CardContent>
          <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              type="date"
              value={inputs.date}
              onChange={(e) => setInputs((s) => ({ ...s, date: e.target.value }))}
            />
            <select
              className={selectClass}
              value={inputs.roomId}
              onChange={(e) => setInputs((s) => ({ ...s, roomId: e.target.value }))}
            >
              <option value="">همه اتاق‌ها</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={inputs.status}
              onChange={(e) => setInputs((s) => ({ ...s, status: e.target.value }))}
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="cancelled">لغو شده</option>
              <option value="deleted">حذف شده</option>
            </select>
            <Input
              placeholder="جستجو (عنوان/نام/موبایل)"
              value={inputs.q}
              onChange={(e) => setInputs((s) => ({ ...s, q: e.target.value }))}
            />
            <Button type="submit">اعمال فیلتر</Button>
          </form>
        </CardContent>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : !data || data.items.length === 0 ? (
        <Alert tone="info">رزروی یافت نشد.</Alert>
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{r.title}</span>
                      <Badge tone={STATUS_BADGE[r.status].tone}>{STATUS_BADGE[r.status].label}</Badge>
                    </div>
                    <div className="text-sm text-slate-500">
                      {formatJalaliFull(r.date)} • {r.room.name} •{' '}
                      <span className="ltr">{slotLabel(r.startTime, r.endTime)}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      رزروکننده: {r.reservedBy?.name} (<span className="ltr">{r.reservedBy?.mobile}</span>) • نفرات:{' '}
                      {toPersianDigits(r.attendees)}
                      {r.participants.length > 0 && ` • ${r.participants.map((p) => p.name).join('، ')}`}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      ویرایش
                    </Button>
                    {r.status === 'active' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busyId === r.id}
                        onClick={() =>
                          act(r.id, () => api.patch(`/admin/reservations/${r.id}/reject`, {}), 'این رزرو رد شود؟')
                        }
                      >
                        رد
                      </Button>
                    )}
                    {r.status !== 'deleted' && (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busyId === r.id}
                        onClick={() =>
                          act(r.id, () => api.del(`/admin/reservations/${r.id}`), 'این رزرو حذف شود؟')
                        }
                      >
                        حذف
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {toPersianDigits(data.total)} رزرو • صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                قبلی
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="ویرایش رزرو">
        <form onSubmit={saveEdit} className="space-y-4">
          {editError && <Alert tone="error">{editError}</Alert>}
          <div>
            <Label htmlFor="etitle">عنوان</Label>
            <Input
              id="etitle"
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="edesc">توضیحات</Label>
            <Textarea
              id="edesc"
              rows={2}
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="eatt">تعداد حاضرین</Label>
            <Input
              id="eatt"
              type="number"
              min={0}
              dir="ltr"
              value={editForm.attendees}
              onChange={(e) => setEditForm((f) => ({ ...f, attendees: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={editForm.reschedule}
              onChange={(e) => setEditForm((f) => ({ ...f, reschedule: e.target.checked }))}
            />
            تغییر اتاق / تاریخ / ساعت
          </label>

          {editForm.reschedule && (
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                className={selectClass}
                value={editForm.roomId}
                onChange={(e) => setEditForm((f) => ({ ...f, roomId: e.target.value }))}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
              />
              <select
                className={selectClass}
                value={editForm.startHour}
                onChange={(e) => setEditForm((f) => ({ ...f, startHour: e.target.value }))}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {`${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" className="w-full" loading={saving}>
            ذخیره تغییرات
          </Button>
        </form>
      </Modal>
    </div>
  );
}

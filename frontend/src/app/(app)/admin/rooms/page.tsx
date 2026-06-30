'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { PageLoader } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea } from '@/components/ui/input';
import type { Room } from '@/lib/types';

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState<Room | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRooms(await api.get<Room[]>('/admin/rooms'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'دریافت اتاق‌ها ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm({ name: '', description: '' });
    setFormError('');
    setCreating(true);
  }

  function openEdit(room: Room) {
    setForm({ name: room.name, description: room.description ?? '' });
    setFormError('');
    setEditing(room);
  }

  async function toggleActive(room: Room) {
    setBusyId(room.id);
    setError('');
    try {
      await api.patch(`/admin/rooms/${room.id}`, { isActive: !room.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تغییر وضعیت ناموفق بود.');
    } finally {
      setBusyId(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await api.patch(`/admin/rooms/${editing.id}`, {
          name: form.name.trim(),
          description: form.description.trim(),
        });
      } else {
        await api.post('/admin/rooms', {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
      }
      setEditing(null);
      setCreating(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'ذخیره ناموفق بود.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">اتاق‌ها</h1>
        <Button onClick={openCreate}>افزودن اتاق</Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{room.name}</span>
                    <Badge tone={room.isActive ? 'green' : 'gray'}>
                      {room.isActive ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </div>
                  {room.description && <p className="text-sm text-slate-500">{room.description}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(room)}>
                    ویرایش
                  </Button>
                  <Button
                    size="sm"
                    variant={room.isActive ? 'secondary' : 'primary'}
                    loading={busyId === room.id}
                    onClick={() => toggleActive(room)}
                  >
                    {room.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'ویرایش اتاق' : 'افزودن اتاق'}
      >
        <form onSubmit={save} className="space-y-4">
          {formError && <Alert tone="error">{formError}</Alert>}
          <div>
            <Label htmlFor="name">نام اتاق</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="rdesc">توضیحات</Label>
            <Textarea
              id="rdesc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Button type="submit" className="w-full" loading={saving}>
            ذخیره
          </Button>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, downloadIcs } from '@/lib/api';
import { formatJalaliFull } from '@/lib/jalali';
import { slotLabel } from '@/lib/date-utils';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { ParticipantsInput } from '@/components/participants-input';
import type { Participant, Reservation } from '@/lib/types';

export interface SlotSelection {
  roomId: string;
  roomName: string;
  date: string;
  start: string;
  end: string;
}

export function ReservationForm({
  open,
  selection,
  onClose,
  onBooked,
}: {
  open: boolean;
  selection: SlotSelection | null;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attendees, setAttendees] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Reservation | null>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setAttendees('');
      setParticipants([]);
      setError('');
      setCreated(null);
    }
  }, [open, selection]);

  if (!selection) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selection) return;
    setError('');
    setLoading(true);
    try {
      const payload = {
        roomId: selection.roomId,
        title: title.trim(),
        description: description.trim() || undefined,
        date: selection.date,
        startTime: selection.start,
        attendees: attendees ? Number(attendees) : participants.length,
        participants: participants.map((p) =>
          p.type === 'user' ? { userId: p.userId } : { guestName: p.name },
        ),
      };
      const res = await api.post<Reservation>('/reservations', payload);
      setCreated(res);
      onBooked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ثبت رزرو ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }

  async function openGoogle() {
    if (!created) return;
    const { url } = await api.get<{ url: string }>(`/reservations/${created.id}/google-calendar`);
    window.open(url, '_blank');
  }

  const header = (
    <div className="ltr text-sm text-slate-500">
      {selection.roomName} • {slotLabel(selection.start, selection.end)}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="ثبت رزرو">
      <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <div className="font-medium text-slate-700">{formatJalaliFull(selection.date)}</div>
        {header}
      </div>

      {created ? (
        <div className="space-y-4">
          <Alert tone="success">رزرو شما با موفقیت ثبت شد. ✅</Alert>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={openGoogle}>
              افزودن به Google Calendar
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadIcs(created.id, `reservation-${created.id}.ics`)}
            >
              دانلود فایل ICS
            </Button>
          </div>
          <Button className="w-full" onClick={onClose}>
            بستن
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div>
            <Label htmlFor="title">عنوان جلسه</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="desc">توضیحات</Label>
            <Textarea
              id="desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="attendees">تعداد حاضرین</Label>
            <Input
              id="attendees"
              type="number"
              min={0}
              dir="ltr"
              placeholder={`${participants.length}`}
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />
          </div>
          <div>
            <Label>شرکت‌کنندگان</Label>
            <ParticipantsInput value={participants} onChange={setParticipants} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" loading={loading}>
              ثبت رزرو
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              انصراف
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

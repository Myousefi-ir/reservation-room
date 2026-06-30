'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { buildDateOptions, firstAllowedISO } from '@/lib/date-utils';
import { formatJalaliFull } from '@/lib/jalali';
import { DateStrip } from '@/components/date-strip';
import { SlotGrid } from '@/components/slot-grid';
import { ReservationForm, SlotSelection } from '@/components/reservation-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import type { Availability, RoomAvailability, Slot } from '@/lib/types';

const LEGEND = [
  { label: 'آزاد', cls: 'bg-green-100 text-green-700' },
  { label: 'رزرو شده', cls: 'bg-red-100 text-red-600' },
  { label: 'گذشته', cls: 'bg-slate-100 text-slate-400' },
];

export default function ReservePage() {
  const dateOptions = useMemo(() => buildDateOptions(14), []);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => firstAllowedISO(dateOptions));
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState<SlotSelection | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadAvailability = useCallback(async (date: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<Availability>(`/availability?date=${date}`);
      setAvailability(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'دریافت اطلاعات ناموفق بود.');
      setAvailability(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) loadAvailability(selectedDate);
  }, [selectedDate, loadAvailability]);

  function onSlotSelect(room: RoomAvailability, slot: Slot) {
    if (!selectedDate) return;
    setSelection({
      roomId: room.roomId,
      roomName: room.roomName,
      date: selectedDate,
      start: slot.start,
      end: slot.end,
    });
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">رزرو جدید</h1>
        <p className="mt-1 text-sm text-slate-500">
          تاریخ و اتاق را انتخاب کنید، سپس روی یک بازهٔ آزاد کلیک کنید.
        </p>
      </div>

      <Card>
        <CardContent>
          <DateStrip options={dateOptions} selected={selectedDate} onSelect={setSelectedDate} />
          {selectedDate && (
            <p className="mt-2 text-sm font-medium text-slate-600">{formatJalaliFull(selectedDate)}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : availability && !availability.isAllowedDay ? (
        <Alert tone="info">این روز قابل رزرو نیست (فقط شنبه تا چهارشنبه).</Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {availability?.rooms.map((room) => (
            <Card key={room.roomId}>
              <CardHeader>
                <CardTitle>{room.roomName}</CardTitle>
              </CardHeader>
              <CardContent>
                <SlotGrid room={room} onSelect={onSlotSelect} />
              </CardContent>
            </Card>
          ))}
          {availability && availability.rooms.length === 0 && (
            <Alert tone="info">اتاق فعالی برای نمایش وجود ندارد.</Alert>
          )}
        </div>
      )}

      <ReservationForm
        open={formOpen}
        selection={selection}
        onClose={() => setFormOpen(false)}
        onBooked={() => selectedDate && loadAvailability(selectedDate)}
      />
    </div>
  );
}

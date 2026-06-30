'use client';

import { cn } from '@/lib/utils';
import { slotLabel } from '@/lib/date-utils';
import type { RoomAvailability, Slot } from '@/lib/types';

const STATUS_STYLE: Record<Slot['status'], string> = {
  available: 'border-green-200 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100 cursor-pointer',
  past: 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed',
  booked: 'border-red-200 bg-red-50 text-red-600 cursor-not-allowed',
  closed: 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed',
};

const STATUS_LABEL: Record<Slot['status'], string> = {
  available: 'آزاد',
  past: 'گذشته',
  booked: 'رزرو شده',
  closed: 'غیرفعال',
};

export function SlotGrid({
  room,
  onSelect,
}: {
  room: RoomAvailability;
  onSelect: (room: RoomAvailability, slot: Slot) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {room.slots.map((slot) => {
        const clickable = slot.status === 'available';
        return (
          <button
            key={slot.start}
            disabled={!clickable}
            onClick={() => clickable && onSelect(room, slot)}
            className={cn(
              'flex flex-col items-center rounded-lg border px-2 py-2 text-center transition-colors',
              STATUS_STYLE[slot.status],
            )}
          >
            <span className="ltr text-sm font-semibold">{slotLabel(slot.start, slot.end)}</span>
            <span className="mt-0.5 text-[11px]">{STATUS_LABEL[slot.status]}</span>
          </button>
        );
      })}
    </div>
  );
}

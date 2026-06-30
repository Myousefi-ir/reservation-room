'use client';

import { cn } from '@/lib/utils';
import type { DateOption } from '@/lib/date-utils';

export function DateStrip({
  options,
  selected,
  onSelect,
}: {
  options: DateOption[];
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
      {options.map((opt) => {
        const active = opt.iso === selected;
        return (
          <button
            key={opt.iso}
            disabled={!opt.isAllowed}
            onClick={() => opt.isAllowed && onSelect(opt.iso)}
            className={cn(
              'flex min-w-[72px] shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors',
              opt.isAllowed
                ? active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300',
            )}
          >
            <span className="text-[11px]">{opt.weekday}</span>
            <span className="text-lg font-bold leading-tight">{opt.day}</span>
            <span className="text-[11px]">{opt.month}</span>
            {opt.isToday && (
              <span
                className={cn(
                  'mt-1 rounded-full px-1.5 text-[10px]',
                  active ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600',
                )}
              >
                امروز
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Participant, UserSearchResult } from '@/lib/types';

export function ParticipantsInput({
  value,
  onChange,
}: {
  value: Participant[];
  onChange: (next: Participant[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [openList, setOpenList] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`);
        setSuggestions(res);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenList(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function addUser(u: UserSearchResult) {
    if (value.some((p) => p.type === 'user' && p.userId === u.id)) return;
    onChange([...value, { type: 'user', userId: u.id, name: u.fullName }]);
    setQuery('');
    setSuggestions([]);
  }

  function addGuest(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange([...value, { type: 'guest', name: trimmed }]);
    setQuery('');
    setSuggestions([]);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div ref={boxRef} className="relative">
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((p, i) => (
            <span
              key={`${p.type}-${p.userId ?? p.name}-${i}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs',
                p.type === 'user' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700',
              )}
            >
              {p.type === 'user' ? '✓' : '+'} {p.name}
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-current/60 hover:text-current"
                aria-label="حذف"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpenList(true);
        }}
        onFocus={() => setOpenList(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions[0]) addUser(suggestions[0]);
            else addGuest(query);
          }
        }}
        placeholder="نام را تایپ کنید… (مثلاً علی)"
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />

      {openList && query.trim().length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => addUser(u)}
              className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-700">{u.fullName}</span>
              <span className="ltr text-xs text-slate-400">{u.mobile}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => addGuest(query)}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-right text-sm text-amber-700 hover:bg-amber-50"
          >
            <span>+</span>
            افزودن «{query.trim()}» به‌عنوان مهمان
          </button>
        </div>
      )}
    </div>
  );
}

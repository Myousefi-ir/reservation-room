import { cn } from '@/lib/utils';

type Tone = 'green' | 'red' | 'yellow' | 'gray' | 'blue';

const TONES: Record<Tone, string> = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-amber-100 text-amber-700',
  gray: 'bg-slate-100 text-slate-600',
  blue: 'bg-brand-100 text-brand-700',
};

export function Badge({
  tone = 'gray',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

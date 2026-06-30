import { cn } from '@/lib/utils';

type Tone = 'error' | 'success' | 'info';

const TONES: Record<Tone, string> = {
  error: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  info: 'bg-brand-50 text-brand-700 border-brand-100',
};

export function Alert({
  tone = 'info',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <div className={cn('rounded-lg border px-3 py-2 text-sm', TONES[tone], className)}>
      {children}
    </div>
  );
}

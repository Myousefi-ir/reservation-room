import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent',
        className,
      )}
    />
  );
}

export function PageLoader({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

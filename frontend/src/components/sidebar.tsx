'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

const USER_LINKS: NavItem[] = [
  { href: '/reserve', label: 'رزرو جدید', icon: '📅' },
  { href: '/my-reservations', label: 'رزروهای من', icon: '🗂️' },
  { href: '/profile', label: 'پروفایل', icon: '👤' },
];

const ADMIN_LINKS: NavItem[] = [
  { href: '/admin', label: 'داشبورد', icon: '📊', exact: true },
  { href: '/admin/users', label: 'کاربران', icon: '👥' },
  { href: '/admin/reservations', label: 'رزروها', icon: '📋' },
  { href: '/admin/rooms', label: 'اتاق‌ها', icon: '🚪' },
];

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      <p className="px-3 pb-1 pt-3 text-xs font-medium text-slate-400">منو</p>
      {USER_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            isActive(pathname, item)
              ? 'bg-brand-50 font-medium text-brand-700'
              : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}

      {user?.role === 'admin' && (
        <>
          <p className="px-3 pb-1 pt-4 text-xs font-medium text-slate-400">مدیریت</p>
          {ADMIN_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive(pathname, item)
                  ? 'bg-brand-50 font-medium text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </>
      )}

      <button
        onClick={onLogout}
        className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        <span>🚪</span>
        خروج
      </button>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-l border-slate-200 bg-white p-4 md:block">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
            M
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              سلام، {user?.firstName}
            </p>
            <p className="text-xs text-slate-400">
              {user?.role === 'admin' ? 'مدیر سیستم' : 'کاربر'}
            </p>
          </div>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            M
          </div>
          <span className="text-sm font-semibold text-slate-700">سلام، {user?.firstName}</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          aria-label="منو"
        >
          ☰
        </button>
      </div>
      {open && (
        <div className="border-b border-slate-200 bg-white px-4 pb-3 md:hidden">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoader } from '@/components/ui/spinner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') router.replace('/reserve');
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return <PageLoader label="بررسی دسترسی…" />;
  }
  return <>{children}</>;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoader } from '@/components/ui/spinner';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role === 'admin') router.replace('/admin');
    else router.replace('/reserve');
  }, [user, loading, router]);

  return <PageLoader />;
}

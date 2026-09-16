'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAppSelector } from '@/store/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, initialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (initialized && !user) {
      router.replace('/login');
    }
  }, [initialized, user, router]);

  if (!initialized) {
    return (
      <main className='flex min-h-screen items-center justify-center px-6'>
        <p className='text-sm text-slate-500'>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}

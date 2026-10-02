'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { NotificationBell } from '@/components/notifications/notification-bell';
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
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <span className="text-sm font-semibold text-slate-950">
            Task Tracker
          </span>

          <NotificationBell />
        </div>
      </header>

      {children}
    </div>
  );
}

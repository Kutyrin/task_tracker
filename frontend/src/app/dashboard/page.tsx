'use client';

import { useAppSelector } from '@/store/hooks';

import { LogoutButton } from '@/components/auth/logout-button';
import { ProtectedRoute } from '@/components/auth/protected-route';

function DashboardContent() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <main className='min-h-screen px-6 py-12'>
      <div className='mx-auto max-w-6xl'>
        <div className='flex items-start justify-between gap-6'>
          <div>
            <p className='text-sm font-medium text-slate-500'>Task Tracker</p>

            <h1 className='mt-2 text-3xl font-semibold text-slate-950'>
              Welcome, {user?.email}
            </h1>

            <p className='mt-2 text-slate-600'>
              Your workspace will be built here next.
            </p>
          </div>

          <LogoutButton />
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

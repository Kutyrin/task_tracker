'use client';

import { useRouter } from 'next/navigation';

import { logout } from '@/lib/auth';
import { clearStoredTokens } from '@/lib/auth-storage';
import { clearAuth } from '@/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { ProtectedRoute } from '@/components/auth/protected-route';

function DashboardContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearStoredTokens();
      dispatch(clearAuth());
      router.replace('/login');
    }
  };

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

          <button
            type='button'
            onClick={handleLogout}
            className='rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100'
          >
            Logout
          </button>
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

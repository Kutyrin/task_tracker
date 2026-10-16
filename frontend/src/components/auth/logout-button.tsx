'use client';
import { Button } from '@/components/ui/button';

import { useRouter } from 'next/navigation';

import { logout } from '@/lib/auth';
import { clearStoredTokens } from '@/lib/auth-storage';
import { clearAuth } from '@/store/auth-slice';
import { useAppDispatch } from '@/store/hooks';

export function LogoutButton() {
  const router = useRouter();
  const dispatch = useAppDispatch();

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
    <Button variant="outline" type="button" onClick={handleLogout}>
      Logout
    </Button>
  );
}

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { useEffect, useState } from 'react';

import { getCurrentUser } from '@/lib/auth';
import { clearStoredTokens, getStoredTokens } from '@/lib/auth-storage';
import { clearAuth, setCredentials, setTokens } from '@/store/auth-slice';
import { useAppDispatch } from '@/store/hooks';
import { store } from '@/store';

function AuthInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const restoreSession = async () => {
      const tokens = getStoredTokens();

      if (!tokens) {
        dispatch(clearAuth());
        return;
      }

      dispatch(setTokens(tokens));

      try {
        const user = await getCurrentUser();

        const currentTokens = getStoredTokens() ?? tokens;

        dispatch(
          setCredentials({
            user,
            tokens: currentTokens,
          }),
        );
      } catch {
        clearStoredTokens();
        dispatch(clearAuth());
      }
    };

    void restoreSession();
  }, [dispatch]);

  return null;
}

export function AppProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer />
        {children}
      </QueryClientProvider>
    </Provider>
  );
}
